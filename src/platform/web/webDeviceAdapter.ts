import type { DeviceAdapter, DeviceClass } from "../adapters/deviceAdapter";

export const classifyDevice = (width: number, height: number): DeviceClass => {
  if (width < 768) return "phone";
  if (width >= 900 && width < 1366 && width > height) return "tablet-landscape";
  if (width >= 768 && width < 1100 && height >= width) return "tablet-portrait";
  return "desktop";
};

export const webDeviceAdapter: DeviceAdapter = {
  getDeviceClass(width = window.innerWidth, height = window.innerHeight): DeviceClass {
    return classifyDevice(width, height);
  }
};
