<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'age')) {
                $table->integer('age')->nullable()->after('email');
            }
            if (! Schema::hasColumn('users', 'gender')) {
                $table->enum('gender', ['masculin', 'féminin', 'autre'])->nullable()->after('age');
            }
            if (! Schema::hasColumn('users', 'region')) {
                $table->string('region', 100)->nullable()->after('gender');
            }
            if (! Schema::hasColumn('users', 'blood_group')) {
                $table->string('blood_group', 5)->nullable()->after('region');
            }
            if (! Schema::hasColumn('users', 'antecedents')) {
                $table->text('antecedents')->nullable()->after('blood_group');
            }
            if (! Schema::hasColumn('users', 'has_sickle_cell')) {
                $table->boolean('has_sickle_cell')->default(false)->after('antecedents');
            }
            if (! Schema::hasColumn('users', 'has_diabetes')) {
                $table->boolean('has_diabetes')->default(false)->after('has_sickle_cell');
            }
            if (! Schema::hasColumn('users', 'has_hypertension')) {
                $table->boolean('has_hypertension')->default(false)->after('has_diabetes');
            }
        });
    }

    public function down(): void
    {
        $columns = [
            'age',
            'gender',
            'region',
            'blood_group',
            'has_sickle_cell',
            'has_diabetes',
            'has_hypertension',
        ];

        Schema::table('users', function (Blueprint $table) use ($columns) {
            $existing = array_filter(
                $columns,
                fn (string $column): bool => Schema::hasColumn('users', $column),
            );

            if ($existing) {
                $table->dropColumn($existing);
            }
        });
    }
};
