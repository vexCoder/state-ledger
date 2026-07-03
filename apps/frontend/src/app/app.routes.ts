import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'task-mapping' },
  {
    path: 'task-mapping',
    title: 'Task Mappings',
    data: { pageTitle: 'Task Mappings' },
    loadComponent: () => import('./pages/task-mapping.page').then((m) => m.TaskMappingPage),
  },
  {
    path: 'task-ledger',
    title: 'Task Ledger',
    data: { pageTitle: 'Task Ledger' },
    loadComponent: () => import('./pages/task-ledger.page').then((m) => m.TaskLedgerPage),
  },
  { path: '**', redirectTo: 'task-mapping' },
];
