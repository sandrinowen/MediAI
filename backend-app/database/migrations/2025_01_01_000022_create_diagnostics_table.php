<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diagnostics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('symptoms_summary')->nullable();
            $table->json('hypotheses')->nullable();
            $table->text('recommended_exams')->nullable();
            $table->text('treatment')->nullable();
            $table->text('alarm_signs')->nullable();
            $table->text('disclaimer')->nullable();
            $table->timestamp('diagnosed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'diagnosed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diagnostics');
    }
};
