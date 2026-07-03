import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

const API_URL = 'http://localhost:3000';

export interface State {
  id: string;
  name: string;
  type: number;
  daysThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface DebugTime {
  offsetHours: number;
  offsetDays: number;
  today: string;
}

export interface SaveStatePayload {
  id?: string;
  name: string;
  type: number;
  daysThreshold: number;
}

export interface User {
  id: string;
  name: string;
}

export interface WorkflowItem {
  id: string;
  name: string;
  currentStateId: string;
  currentState: State;
  userId: string;
  user: User;
  createdAt: string;
  updatedAt: string;
  daysInState: number | null;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  getStates() {
    return this.http.get<State[]>(`${API_URL}/states`);
  }

  saveStates(states: SaveStatePayload[]) {
    return this.http.put<State[]>(`${API_URL}/states`, states);
  }

  getWorkflowItems() {
    return this.http.get<WorkflowItem[]>(`${API_URL}/workflow-items`);
  }

  updateWorkflowItemState(itemId: string, stateId: string) {
    return this.http.patch<WorkflowItem>(`${API_URL}/workflow-items/${itemId}/state`, { stateId });
  }

  getDebugTime() {
    return this.http.get<DebugTime>(`${API_URL}/debug/time`);
  }

  setDebugTime(offsetHours: number) {
    return this.http.put<DebugTime>(`${API_URL}/debug/time`, { offsetHours });
  }
}
