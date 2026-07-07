<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'nom'            => fake()->lastName(),
            'prenom'         => fake()->firstName(),
            'email'          => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password'       => static::$password ??= Hash::make('password123'),
            'date_naissance' => fake()->date(),
            'sexe'           => fake()->randomElement(['M', 'F']),
            'consent_rgpd'   => true,
        ];
    }
}
