<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json(['status' => 'CUP-FICCT API running']);
});

