import * as vscode from 'vscode';

import * as ipc from '../driver/ipc';

import { resource } from '../utils';
import { ProviderType, App, Process, Device, Node } from '../types';

export class DevicesProvider implements vscode.TreeDataProvider<TargetItem> {

  private _onDidChangeTreeData: vscode.EventEmitter<TargetItem | undefined> = new vscode.EventEmitter<TargetItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<TargetItem | undefined> = this._onDidChangeTreeData.event;

  constructor(
    public readonly type: ProviderType
  ) {

  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TargetItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TargetItem): Thenable<TargetItem[]> {
    if (element) {
      return element.children();
    } else {
      if (ipc.alive()) {
        return ipc.devices().then(devices => devices.map(device => new DeviceItem(device, this.type)));
      }
      return Promise.resolve([]);
    }
  }
}

export abstract class TargetItem extends vscode.TreeItem {
  abstract children(): Thenable<TargetItem[]>;
}

export class DeviceItem extends TargetItem {
  constructor(
    public readonly data: Device,
    public readonly type: ProviderType,
  ) {
    super(data.name, vscode.TreeItemCollapsibleState.Collapsed);
  }

  get tooltip(): string {
    return `${this.data.id} (${this.data.type})`;
  }

  get description(): string {
    return this.data.id;
  }

  get iconPath() {
    return {
      light: resource('light', `${this.data.type}.svg`),
      dark: resource('dark', `${this.data.type}.svg`),
    };
  }

  children(): Thenable<TargetItem[]> {
    const device = this.data;
    if (this.type === ProviderType.Apps) {
      return ipc.apps(device.id)
        .then(apps => apps.map(app => new AppItem(app, device)))
        .catch(e => [new NotFound(e, device)]);
    } else if (this.type === ProviderType.Processes) {
      return ipc.ps(device.id)
        .then(ps => ps.map(p => new ProcessItem(p, device)))
        .catch(e => [new NotFound(e, device)]);
    }
    return Promise.resolve([]);
  }

  contextValue = 'device';
}

export class NotFound extends TargetItem {
  constructor(
    public readonly reason: Error,
    public readonly device: Device,
  ) {
    super(reason.message, vscode.TreeItemCollapsibleState.None);
  }

  children(): Thenable<TargetItem[]> {
    return Promise.resolve([]);
  }

  get tooltip() { return this.reason.message; }

  iconPath = {
    dark: resource('dark', 'error.svg'),
    light: resource('light', 'error.svg')
  };

  contextValue = 'empty';
}

export class HierarchyItem extends TargetItem {
  constructor(
    public readonly name: string,
    public readonly tree: Node,
  ) {
    super(name, vscode.TreeItemCollapsibleState.Collapsed);
  }

  children(): Thenable<TargetItem[]> {
    return Promise.resolve(HierarchyItem.expand(this.tree));
  }

  static expand(tree: Node) {
    return Object.entries(tree).map(([name, node]) => new HierarchyItem(name, node))
  }
}

export class AppItem extends TargetItem {
  constructor(
    public readonly data: App,
    public readonly device: Device,
  ) {
    super(data.name, vscode.TreeItemCollapsibleState.Collapsed);
  }

  get tooltip(): string {
    return `${this.label} (${this.data.pid || 'Not Running'})`;
  }

  get description(): string {
    return this.data.identifier;
  }

  children(): Thenable<TargetItem[]> {
    if (!this.data.pid) {
      return Promise.resolve([]);
    }

    return ipc.classes(this.device.id, this.data.pid).then(root => HierarchyItem.expand(root));  
  }

  get command() {
    return {
      command: 'frida.passionfruit',
      title: '',
      arguments: [this]
    };
  }

  get iconPath() {
    if (this.data.largeIcon) {
      return vscode.Uri.parse(this.data.largeIcon);
    }

    const img = this.data.pid ? 'statusRun.svg' : 'statusStop.svg';
    return {
      dark: resource('dark', img),
      light: resource('light', img)
    };
  }

  contextValue = 'app';
}

export class ProcessItem extends TargetItem {
  constructor(
    public readonly data: Process,
    public readonly device: Device,
  ) {
    super(data.name, vscode.TreeItemCollapsibleState.Collapsed);
  }

  get tooltip(): string {
    return `${this.label} (${this.data.pid})`;
  }

  get description(): string {
    return this.data.pid.toString();
  }

  children(): Thenable<TargetItem[]> {
    return ipc.classes(this.device.id, this.data.pid).then(root => HierarchyItem.expand(root));
    // return Promise.resolve([]);
  }

  get iconPath() {
    if (this.data.largeIcon) {
      return vscode.Uri.parse(this.data.largeIcon);
    }

    const img = this.data.pid ? 'statusRun.svg' : 'statusStop.svg';
    return {
      dark: resource('dark', img),
      light: resource('light', img)
    };
  }

  contextValue = 'process';
}