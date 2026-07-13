export type DeviceClass = "phone" | "tablet-portrait" | "tablet-landscape" | "desktop";

export interface DeviceAdapter {
  getDeviceClass(width?: number, height?: number): DeviceClass;
}
