import type { Locator } from '@playwright/test';
import { BaseComponent } from './base.component';

export interface ProjectCardSnapshot {
  name: string;
  description: string;
  archived: boolean;
}

/**
 * Component Object de `project-card` — la tarjeta de la lista de proyectos.
 *
 * Quedó fuera del primer corte (ver ADR 0001) por considerarse solo lectura.
 * Al escribir los specs de la pantalla apareció lo que faltaba: el test navega
 * desde ella por dos links distintos y el badge "Archivado" hace que no todas
 * las instancias se rendericen igual.
 */
export class ProjectCardComponent extends BaseComponent {
  static readonly TEST_ID = 'project-card';

  get nameLink(): Locator {
    return this.child('project-card-name');
  }

  get description(): Locator {
    return this.child('project-card-description');
  }

  get membersLink(): Locator {
    return this.child('project-card-members-link');
  }

  get archivedBadge(): Locator {
    return this.child('project-card-archived');
  }

  async name(): Promise<string> {
    return this.textOf('project-card-name');
  }

  async isArchived(): Promise<boolean> {
    return (await this.archivedBadge.count()) > 0;
  }

  /** Abre el tablero del proyecto. */
  async open(): Promise<void> {
    await this.nameLink.click();
  }

  /** Abre la pantalla de miembros del proyecto. */
  async openMembers(): Promise<void> {
    await this.membersLink.click();
  }

  async snapshot(): Promise<ProjectCardSnapshot> {
    return {
      name: await this.name(),
      description: await this.textOf('project-card-description'),
      archived: await this.isArchived(),
    };
  }
}
