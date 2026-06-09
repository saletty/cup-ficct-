<?php

namespace App\Providers;

use App\Mail\Seguridad\Transport\BrevoTransport;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Mail::extend('brevo', function () {
            return new BrevoTransport(config('services.brevo.key'));
        });
    }
}
