<?php

namespace App\Providers;

use Illuminate\Support\Facades\Mail;
use Illuminate\Support\ServiceProvider;
use Symfony\Component\HttpClient\HttpClient;
use Symfony\Component\Mailer\Bridge\Brevo\Transport\BrevoApiTransportFactory;
use Symfony\Component\Mailer\Transport\Dsn;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Mail::extend('brevo', function () {
            $factory = new BrevoApiTransportFactory(null, HttpClient::create());
            return $factory->create(new Dsn('brevo+api', 'default', config('services.brevo.key')));
        });
    }
}
