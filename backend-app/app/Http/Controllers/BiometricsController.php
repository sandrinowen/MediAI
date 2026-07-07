<?php

namespace App\Http\Controllers;

use App\Models\DonneesBiometriques;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// ═══════════════════════════════════════════════════════════════
//  BiometricsController
//  Stockage et lecture des 3 métriques IoT réelles (ESP32 v2).
//  Capteurs : MLX90614 (temp) + MAX30102 (FC + SpO2)
// ═══════════════════════════════════════════════════════════════
class BiometricsController extends Controller
{
    /**
     * POST /api/biometrics — enregistre une mesure des 3 capteurs réels.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'temperature'       => ['nullable', 'numeric', 'between:30,45'],
            'freq_cardiaque'    => ['nullable', 'integer', 'between:20,300'],
            'spo2'              => ['nullable', 'integer', 'between:50,100'],
            'contexte'          => ['nullable', 'in:repos,effort,apres_repas,matin,soir'],
        ]);

        $data['user_id']   = $request->user()->id;
        $data['timestamp'] = now();

        $mesure = DonneesBiometriques::create($data);

        return response()->json([
            'message'    => 'Mesures enregistrées',
            'biometrics' => $mesure,
        ], 201);
    }

    /**
     * GET /api/biometrics/latest — dernière mesure de l'utilisateur.
     */
    public function latest(Request $request): JsonResponse
    {
        $mesure = $request->user()
            ->biometrics()
            ->latest('timestamp')
            ->first();

        return response()->json([
            'biometrics' => $mesure,
            'snapshot'   => $mesure ? [
                'temp' => $mesure->temperature,
                'hr'   => $mesure->freq_cardiaque,
                'spo2' => $mesure->spo2,
            ] : null,
        ]);
    }

    /**
     * GET /api/biometrics — historique paginé des mesures.
     */
    public function index(Request $request): JsonResponse
    {
        $mesures = $request->user()
            ->biometrics()
            ->latest('timestamp')
            ->paginate($request->integer('per_page', 20));

        return response()->json($mesures);
    }
}