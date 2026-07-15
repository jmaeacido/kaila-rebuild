<?php

namespace App\Http\Controllers;

use App\Http\Resources\CurrentUserResource;
use Illuminate\Http\Request;

class CurrentUserController extends Controller
{
    public function __invoke(Request $request): CurrentUserResource
    {
        return new CurrentUserResource($request->user());
    }
}
