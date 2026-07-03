import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { DebugPanel } from './debug-panel';

interface NavItem {
  label: string;
  path: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, DebugPanel],
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);

  protected readonly menuOpen = signal(false);

  protected readonly pageTitle = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => {
        let route = this.router.routerState.snapshot.root;
        while (route.firstChild) {
          route = route.firstChild;
        }
        return (route.data['pageTitle'] as string) ?? '';
      }),
    ),
    { initialValue: '' },
  );

  protected readonly navItems: NavItem[] = [
    { label: 'Task Mappings', path: '/task-mapping' },
    { label: 'Task Ledger', path: '/task-ledger' },
  ];

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
