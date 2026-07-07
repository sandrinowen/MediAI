<?php

use App\Mail\EmailVerificationCodeMail;
use App\Models\User;
use App\Models\ChatMessage;
use App\Models\Medecin;
use App\Models\Consultation;
use App\Models\DonneesBiometriques;
use App\Models\RendezVous;
use App\Models\Historique;
use Database\Seeders\DoctorSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use function Pest\Laravel\{postJson, getJson, putJson, patchJson, actingAs, seed};

// RefreshDatabase is bound globally via tests/Pest.php
// All auth-protected routes tested via actingAs() — Sanctum guard.

// ───────────────────────────────────────────────────────────────
//  AUTH
// ───────────────────────────────────────────────────────────────
describe('Auth', function () {

    test('register creates user with RGPD consent', function () {
        Mail::fake();

        $res = postJson('/api/register', [
            'nom'        => 'Test',
            'prenom'     => 'User',
            'email'      => 'test@user.cm',
            'password'   => 'password123',
            'password_confirmation' => 'password123',
            'telephone'             => '+237699887766',
            'consent_rgpd'          => true,
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('user.email', 'test@user.cm')
            ->assertJsonPath('requires_email_verification', true);

        expect(User::count())->toBe(1);
        expect(User::first()->email_verified_at)->toBeNull();
        expect(User::first()->tokens()->count())->toBe(0);
        expect(DB::table('email_verification_codes')->where('email', 'test@user.cm')->exists())->toBeTrue();

        Mail::assertSent(EmailVerificationCodeMail::class, fn ($mail) => $mail->hasTo('test@user.cm'));
    });

    test('email verification validates account and creates token', function () {
        $user = User::factory()->create([
            'email' => 'verify@test.cm',
            'email_verified_at' => null,
        ]);
        DB::table('email_verification_codes')->insert([
            'email' => $user->email,
            'token' => Hash::make('123456'),
            'created_at' => now(),
        ]);

        $res = postJson('/api/verify-email', [
            'email' => 'verify@test.cm',
            'code' => '123456',
        ]);

        $res->assertStatus(200)
            ->assertJsonStructure(['user', 'token'])
            ->assertJsonPath('user.email', 'verify@test.cm');

        expect($user->fresh()->email_verified_at)->not->toBeNull();
        expect($user->fresh()->tokens()->count())->toBe(1);
        expect(DB::table('email_verification_codes')->where('email', $user->email)->exists())->toBeFalse();
    });

    test('email verification rejects wrong code', function () {
        $user = User::factory()->create([
            'email' => 'badcode@test.cm',
            'email_verified_at' => null,
        ]);
        DB::table('email_verification_codes')->insert([
            'email' => $user->email,
            'token' => Hash::make('123456'),
            'created_at' => now(),
        ]);

        postJson('/api/verify-email', [
            'email' => 'badcode@test.cm',
            'code' => '000000',
        ])->assertStatus(422);

        expect($user->fresh()->email_verified_at)->toBeNull();
    });

    test('register rejects without RGPD', function () {
        $res = postJson('/api/register', [
            'nom'      => 'X',
            'prenom'   => 'X',
            'email'    => 'x@y.cm',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'consent_rgpd'          => false,
        ]);
        $res->assertStatus(422);
    });

    test('register rejects duplicate email', function () {
        User::factory()->create(['email' => 'dup@test.cm']);

        $res = postJson('/api/register', [
            'nom'      => 'Dup',
            'prenom'   => 'User',
            'email'    => 'dup@test.cm',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'consent_rgpd'          => true,
        ]);
        $res->assertStatus(422);
    });

    test('login with valid credentials', function () {
        User::factory()->create([
            'email'    => 'login@test.cm',
            'password' => 'password123',
        ]);

        $res = postJson('/api/login', [
            'email'    => 'login@test.cm',
            'password' => 'password123',
        ]);

        $res->assertStatus(200)->assertJsonStructure(['user', 'token']);
    });

    test('login rejects unverified account', function () {
        User::factory()->create([
            'email' => 'pending@test.cm',
            'password' => 'password123',
            'email_verified_at' => null,
        ]);

        postJson('/api/login', [
            'email' => 'pending@test.cm',
            'password' => 'password123',
        ])->assertStatus(422);
    });

    test('login rejects wrong password', function () {
        User::factory()->create(['email' => 'wrong@test.cm', 'password' => 'valid']);

        postJson('/api/login', ['email' => 'wrong@test.cm', 'password' => 'bad'])
            ->assertStatus(422);
    });

    test('me returns authenticated user', function () {
        $user = User::factory()->create();

        actingAs($user)->getJson('/api/me')
            ->assertStatus(200)
            ->assertJsonPath('user.id', $user->id);
    });

    test('me rejects unauthenticated', function () {
        getJson('/api/me')->assertStatus(401);
    });

    test('logout removes current token', function () {
        $user   = User::factory()->create();
        $token  = $user->createToken('mobile')->plainTextToken;

        postJson('/api/logout', [], ['Authorization' => "Bearer $token"])
            ->assertStatus(200);

        expect($user->tokens()->count())->toBe(0);
    });

    test('update profile', function () {
        $user = User::factory()->create(['telephone' => null]);

        actingAs($user)->putJson('/api/profile', [
            'telephone'    => '+237600000000',
            'groupe_sanguin' => 'O+',
            'has_sickle_cell' => true,
        ])->assertStatus(200)
          ->assertJsonPath('user.telephone', '+237600000000')
          ->assertJsonPath('user.has_sickle_cell', true);
    });


    test('admin role change to medecin creates doctor directory entry', function () {
        $admin = User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create([
            'role' => 'patient',
            'nom' => 'Nkoa',
            'prenom' => 'Alice',
            'email' => 'alice.nkoa@test.cm',
        ]);

        actingAs($admin)->patchJson("/api/users/{$target->id}/role", [
            'role' => 'medecin',
        ])->assertStatus(200)
          ->assertJsonPath('user.role', 'medecin');

        expect($target->fresh()->medecin)->not->toBeNull();
        expect($target->fresh()->medecin->nom)->toBe('Alice Nkoa');
    });
});

// ───────────────────────────────────────────────────────────────
//  CHAT MEDGEMMA
// ───────────────────────────────────────────────────────────────
describe('Chat MedGemma', function () {

    test('message endpoint calls MedGemma and persists conversation', function () {
        config([
            'services.huggingface.token' => 'test-token',
            'services.huggingface.model' => 'mistralai/Mistral-7B-Instruct-v0.3',
            'services.huggingface.model_url' => 'https://example.test/v1/chat/completions',
            'services.huggingface.timeout' => 10,
        ]);

        \Illuminate\Support\Facades\Http::fake([
            'https://example.test/v1/chat/completions' => \Illuminate\Support\Facades\Http::response([
                'choices' => [[
                    'message' => ['content' => "Diagnostic probable : Paludisme suspect\nCauses possibles : piqûre de moustique infecté ; exposition en zone de transmission\nPrescriptions / conduite à tenir : faire un test de diagnostic rapide ; boire suffisamment ; consulter un médecin.\nRésumé : fièvre et frissons rapportés."],
                ]],
            ], 200),
        ]);

        $user = User::factory()->create([
            'nom' => 'Mbarga',
            'prenom' => 'Jean',
            'sexe' => 'M',
        ]);

        $res = actingAs($user)->postJson('/api/chat/message', [
            'message' => 'J ai de la fièvre et des frissons depuis deux jours',
            'iot_data' => [
                'temperature' => 38.6,
                'spo2' => 97,
                'heartRate' => 102,
                'bloodPressure' => '120/80',
            ],
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('message.role', 'assistant')
            ->assertJsonPath('message.model', 'mistralai/Mistral-7B-Instruct-v0.3');

        expect(ChatMessage::count())->toBe(2);
        expect(ChatMessage::where('role', 'user')->first()->iot_data['temperature'])->toBe(38.6);
        expect(ChatMessage::where('role', 'assistant')->first()->content)->toContain('Paludisme');

        $consultation = Consultation::first();
        expect($consultation)->not->toBeNull();
        expect($consultation->user_id)->toBe($user->id);
        expect($consultation->symptomes)->toBe(['J ai de la fièvre et des frissons depuis deux jours']);
        expect($consultation->pathologie_detectee)->toBe('Paludisme suspect');
        expect($consultation->score_ia)->toBe(75.0);
        expect($consultation->urgence)->toBe(2);
        expect($consultation->iot_data)->toMatchArray([
            'temp' => 38.6,
            'hr' => 102,
            'spo2' => 97,
            'bp' => '120/80',
        ]);
        expect($consultation->resultats[0]['diagnostic'])->toBe('Paludisme suspect');
        expect($consultation->resultats[0]['causes'])->toContain('piqûre de moustique infecté ; exposition en zone de transmission');
        expect($consultation->resultats[0]['prescriptions'])->toContain('faire un test de diagnostic rapide ; boire suffisamment ; consulter un médecin.');
        expect($consultation->facteurs_risque)->toBe($consultation->resultats[0]['causes']);

        \Illuminate\Support\Facades\Http::assertSent(function ($request) {
            $messages = $request['messages'];

            return $request->url() === 'https://example.test/v1/chat/completions'
                && $request->hasHeader('Authorization', 'Bearer test-token')
                && $request['model'] === 'mistralai/Mistral-7B-Instruct-v0.3'
                && $messages[0]['role'] === 'system'
                && str_contains($messages[0]['content'], 'Temperature : 38.6 degC')
                && str_contains($messages[0]['content'], 'systeme de sante camerounais')
                && collect($messages)->contains(fn ($message) => $message['role'] === 'user' && str_contains($message['content'], 'fièvre'));
        });
    });

    test('message endpoint validates payload', function () {
        $user = User::factory()->create();

        actingAs($user)->postJson('/api/chat/message', [
            'message' => 'a',
            'iot_data' => ['temperature' => 50],
        ])->assertStatus(422)
          ->assertJsonValidationErrors(['message', 'iot_data.temperature']);
    });

    test('history and clear endpoints are scoped to current user', function () {
        $user = User::factory()->create();
        $other = User::factory()->create();

        ChatMessage::create(['user_id' => $user->id, 'role' => 'user', 'content' => 'Bonjour']);
        ChatMessage::create(['user_id' => $user->id, 'role' => 'assistant', 'content' => 'Bonjour, comment puis-je aider ?']);
        ChatMessage::create(['user_id' => $other->id, 'role' => 'user', 'content' => 'Message prive']);

        actingAs($user)->getJson('/api/chat/history')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.content', 'Bonjour');

        actingAs($user)->deleteJson('/api/chat/clear')
            ->assertStatus(200);

        expect(ChatMessage::where('user_id', $user->id)->count())->toBe(0);
        expect(ChatMessage::where('user_id', $other->id)->count())->toBe(1);
    });
});

// ───────────────────────────────────────────────────────────────
//  BIOMETRICS
// ───────────────────────────────────────────────────────────────
describe('Biometrics', function () {

    test('store biometrics measures', function () {
        $user = User::factory()->create();

        actingAs($user)->postJson('/api/biometrics', [
            'temperature'    => 37.2,
            'freq_cardiaque' => 72,
            'spo2'           => 98,
            'contexte'       => 'repos',
        ])->assertStatus(201)
          ->assertJsonPath('biometrics.temperature', 37.2);

        expect(DonneesBiometriques::count())->toBe(1);
    });

    test('latest returns most recent measure', function () {
        $user = User::factory()->create();
        DonneesBiometriques::create(['user_id' => $user->id, 'temperature' => 37.0,
            'freq_cardiaque' => 70, 'spo2' => 97, 'timestamp' => now()->subHour()]);
        DonneesBiometriques::create(['user_id' => $user->id, 'temperature' => 38.5,
            'freq_cardiaque' => 100, 'spo2' => 95, 'timestamp' => now()]);

        actingAs($user)->getJson('/api/biometrics/latest')
            ->assertStatus(200)
            ->assertJsonPath('biometrics.temperature', 38.5);
    });

    test('biometrics validation rejects out-of-range values', function () {
        $user = User::factory()->create();

        actingAs($user)->postJson('/api/biometrics', [
            'temperature' => 50.0,  // hors plage 30-45
        ])->assertStatus(422);
    });
});

// ───────────────────────────────────────────────────────────────
//  DOCTORS & RDV
// ───────────────────────────────────────────────────────────────
describe('Doctors & RDV', function () {

    test('doctors list filtered by speciality', function () {
        $cardioUser = User::factory()->create(['role' => 'medecin']);
        $cardioUser->medecin()->create([
            'nom' => 'Dr. A',
            'specialite' => 'Cardiologue',
            'horaires' => [],
            'actif' => true,
        ]);

        $infectioUser = User::factory()->create(['role' => 'medecin']);
        $infectioUser->medecin()->create([
            'nom' => 'Dr. B',
            'specialite' => 'Infectiologue',
            'horaires' => [],
            'actif' => true,
        ]);

        Medecin::create([
            'nom' => 'Dr. Demo',
            'specialite' => 'Cardiologue',
            'horaires' => [],
            'actif' => true,
        ]);

        $user = User::factory()->create();
        actingAs($user)->getJson('/api/doctors?specialite=Cardiologue')
            ->assertStatus(200)
            ->assertJsonCount(1, 'doctors')
            ->assertJsonPath('doctors.0.nom', 'Dr. A');
    });

    test('patient can book a seeded doctor from available slots', function () {
        seed(DoctorSeeder::class);

        $patient = User::factory()->create();
        $doctorsResponse = actingAs($patient)->getJson('/api/doctors')
            ->assertStatus(200)
            ->assertJsonCount(5, 'doctors');

        $doctor = $doctorsResponse->json('doctors.0');
        expect($doctor['user_id'])->not->toBeNull();

        $date = now()->next('monday')->toDateString();
        $slotsResponse = actingAs($patient)->getJson("/api/doctors/{$doctor['id']}?date={$date}")
            ->assertStatus(200)
            ->assertJsonPath('date', $date);

        $slot = collect($slotsResponse->json('creneaux'))->firstWhere('disponible', true);
        expect($slot)->not->toBeNull();

        actingAs($patient)->postJson('/api/rdv', [
            'medecin_id' => $doctor['id'],
            'date_rdv'   => $date,
            'creneau'    => $slot['heure'],
            'motif'      => 'Consultation depuis le parcours patient',
        ])->assertStatus(201)
          ->assertJsonPath('rendez_vous.medecin_id', $doctor['id'])
          ->assertJsonPath('rendez_vous.statut', 'planifie');

        expect(RendezVous::count())->toBe(1);
    });

    test('book RDV and reject double-booking', function () {
        $user     = User::factory()->create();
        $medecin  = Medecin::create([
            'nom' => 'Dr. X', 'specialite' => 'Généraliste',
            'horaires' => ['lundi' => ['08:00', '09:00']], 'actif' => true,
        ]);
        $date = now()->addDays(3)->format('Y-m-d');

        // Premier booking → OK
        actingAs($user)->postJson('/api/rdv', [
            'medecin_id' => $medecin->id,
            'date_rdv'   => $date,
            'creneau'    => '08:00',
            'motif'      => 'Consultation',
        ])->assertStatus(201);

        // Double booking → 422
        actingAs($user)->postJson('/api/rdv', [
            'medecin_id' => $medecin->id,
            'date_rdv'   => $date,
            'creneau'    => '08:00',
        ])->assertStatus(422);

        expect(RendezVous::count())->toBe(1);
    });

    test('cancel RDV', function () {
        $user    = User::factory()->create();
        $medecin = Medecin::create(['nom' => 'Dr. Y', 'specialite' => 'Généraliste',
            'horaires' => ['lundi' => ['08:00']], 'actif' => true]);

        $rdv = RendezVous::create([
            'user_id'    => $user->id,
            'medecin_id' => $medecin->id,
            'date_rdv'   => now()->addDays(1),
            'creneau'    => '08:00',
            'statut'     => 'planifie',
        ]);

        actingAs($user)->patchJson("/api/rdv/{$rdv->id}/cancel")
            ->assertStatus(200);

        expect($rdv->fresh()->statut)->toBe('annule');
    });

    test('cannot cancel another user RDV', function () {
        $owner   = User::factory()->create();
        $intruder = User::factory()->create();
        $medecin = Medecin::create(['nom' => 'Dr. Z', 'specialite' => 'Généraliste',
            'horaires' => ['lundi' => ['08:00']], 'actif' => true]);

        $rdv = RendezVous::create([
            'user_id'    => $owner->id,
            'medecin_id' => $medecin->id,
            'date_rdv'   => now()->addDays(1),
            'creneau'    => '08:00',
        ]);

        actingAs($intruder)->patchJson("/api/rdv/{$rdv->id}/cancel")
            ->assertStatus(403);
    });


    test('doctor sees assigned consultations and can confirm', function () {
        $doctorUser = User::factory()->create(['role' => 'medecin']);
        $patient = User::factory()->create();
        $medecin = Medecin::create([
            'user_id' => $doctorUser->id,
            'nom' => 'Dr. Linked',
            'specialite' => 'Généraliste',
            'horaires' => ['lundi' => ['08:00']],
            'actif' => true,
        ]);

        $rdv = RendezVous::create([
            'user_id' => $patient->id,
            'medecin_id' => $medecin->id,
            'date_rdv' => now()->addDays(1),
            'creneau' => '08:00',
            'statut' => 'planifie',
            'motif' => 'Fièvre persistante',
        ]);

        actingAs($doctorUser)->getJson('/api/rdv')
            ->assertStatus(200)
            ->assertJsonCount(1, 'rendez_vous')
            ->assertJsonPath('rendez_vous.0.user.id', $patient->id);

        actingAs($doctorUser)->patchJson("/api/rdv/{$rdv->id}/confirm")
            ->assertStatus(200)
            ->assertJsonPath('rendez_vous.statut', 'confirme');

        expect($rdv->fresh()->statut)->toBe('confirme');
    });

    test('doctor can access patient carnet only after confirmed appointment', function () {
        $doctorUser = User::factory()->create(['role' => 'medecin']);
        $patient = User::factory()->create(['nom' => 'Patient', 'prenom' => 'Autorise']);
        $medecin = Medecin::create([
            'user_id' => $doctorUser->id,
            'nom' => 'Dr. Carnet',
            'specialite' => 'Généraliste',
            'horaires' => ['lundi' => ['08:00']],
            'actif' => true,
        ]);

        $rdv = RendezVous::create([
            'user_id' => $patient->id,
            'medecin_id' => $medecin->id,
            'date_rdv' => now()->addDays(1),
            'creneau' => '08:00',
            'statut' => 'planifie',
        ]);

        actingAs($doctorUser)->getJson("/api/carnet?patient_id={$patient->id}")
            ->assertStatus(403);

        $rdv->update(['statut' => 'confirme']);

        actingAs($doctorUser)->getJson("/api/carnet?patient_id={$patient->id}")
            ->assertStatus(200)
            ->assertJsonPath('user.id', $patient->id);
    });
});

// ───────────────────────────────────────────────────────────────
//  HISTORIQUE
// ───────────────────────────────────────────────────────────────
describe('Historique', function () {

    test('index returns user consultations', function () {
        $user = User::factory()->create();
        $c = Consultation::create(['user_id' => $user->id, 'symptomes' => ['fievre'],
            'facteurs_risque' => [], 'score_ia' => 80, 'pathologie_detectee' => 'Paludisme', 'duree_analyse_ms' => 45]);

        actingAs($user)->getJson('/api/historique')
            ->assertStatus(200)
            ->assertJsonPath('data.0.pathologie_detectee', 'Paludisme');

        // Un autre user ne voit rien
        $other = User::factory()->create();
        actingAs($other)->getJson('/api/historique')
            ->assertJsonCount(0, 'data.*');
    });
});

// ───────────────────────────────────────────────────────────────
//  CARNET
// ───────────────────────────────────────────────────────────────
describe('Carnet', function () {

    test('show returns carnet data', function () {
        $user = User::factory()->create(['nom' => 'Mbarga', 'prenom' => 'Jean']);

        actingAs($user)->getJson('/api/carnet')
            ->assertStatus(200)
            ->assertJsonPath('user.nom', 'Mbarga');
    });

    test('export generates PDF', function () {
        $user = User::factory()->create();

        actingAs($user)->getJson('/api/carnet/export/base64')
            ->assertStatus(200)
            ->assertJsonStructure(['filename', 'mime', 'base64']);
    });
});
