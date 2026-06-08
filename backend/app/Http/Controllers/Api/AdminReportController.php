<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminReportsRequest;
use App\Services\Admin\AdminReportingService;
use Illuminate\Http\JsonResponse;

class AdminReportController extends Controller
{
    public function __construct(private readonly AdminReportingService $reportingService)
    {
    }

    public function index(AdminReportsRequest $request): JsonResponse
    {
        $range = $request->validated('range') ?? '30d';

        return response()->json([
            'data' => $this->reportingService->buildReport($range),
        ]);
    }
}
