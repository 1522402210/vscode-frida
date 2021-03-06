
export enum ProviderType {
  Apps = 'apps',
  Processes = 'ps',
}

export enum DeviceType {
  Local = 'local',
  Remote = 'remote',
  USB = 'usb',
}

export class Device {
  id: string = '';
  name: string = '';
  type: DeviceType = DeviceType.Local;
  icon: string = '';
}

export enum ItemType {
  device = 'Device',
  app = 'App',
  process = 'Process'
}

export class App {
  identifier: string = '';
  name: string = '';
  pid: number = 0;
  largeIcon: string = '';
  smallIcon: string = '';
}

export class Process {
  name: string = '';
  pid: number = 0;
  largeIcon: string = '';
  smallIcon: string = '';
}