<?php

namespace App\Console\Commands;

use App\Services\Checkout\OrderLifecycleService;
use Illuminate\Console\Command;

class ExpireUnpaidOrders extends Command
{
    protected $signature = 'orders:expire-unpaid';

    protected $description = 'Cancel pending unpaid orders that have exceeded the action window.';

    public function handle(OrderLifecycleService $orderLifecycleService): int
    {
        $cancelled = $orderLifecycleService->expireOverdueUnpaidOrders();

        $this->info("Cancelled {$cancelled} overdue unpaid order(s).");

        return self::SUCCESS;
    }
}
