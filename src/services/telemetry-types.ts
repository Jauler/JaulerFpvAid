export interface ChannelsData {
  channels: number[]; // 16 values in microseconds (988–2012)
}

export interface GpsData {
  latitude: number; // degree / 10,000,000
  longitude: number; // degree / 10,000,000
  groundSpeed: number; // km/h / 100
  heading: number; // degree / 100
  altitude: number; // meter - 1000m offset
  satellites: number;
}

export interface GpsTimeData {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

export interface GpsExtendedData {
  fixType: number;
  nSpeed: number; // cm/s northward
  eSpeed: number; // cm/s eastward
  vSpeed: number; // cm/s vertical (up=positive)
  hSpeedAcc: number; // cm/s
  trackAcc: number; // degrees * 10
  altEllipsoid: number; // meters
  hAcc: number; // cm
  vAcc: number; // cm
  reserved: number;
  hDOP: number; // units of 0.1
  vDOP: number; // units of 0.1
}

export interface VariometerData {
  vSpeed: number; // cm/s vertical
}

export interface BatteryData {
  voltage: number; // LSB = 100 mV
  current: number; // LSB = 100 mA
  capacityUsed: number; // mAh
  remaining: number; // percent
}

export interface BaroAltVertSpeedData {
  altitudePacked: number;
  verticalSpeedPacked: number;
}

export interface AirspeedData {
  speed: number; // 0.1 km/h
}

export interface HeartbeatData {
  originAddress: number;
}

export interface RpmData {
  rpmSourceId: number;
  rpmValues: number[]; // 19 values
}

export interface TempData {
  tempSourceId: number;
  temperatures: number[]; // 20 values, deci-degrees Celsius
}

export interface VoltagesData {
  sourceId: number;
  voltages: number[]; // 29 values, millivolts
}

export interface VtxTelemetryData {
  originAddress: number;
  powerDbm: number;
  frequencyMhz: number;
  pitMode: number;
  pitModeControl: number;
  pitModeSwitch: number;
}

export interface BarometerData {
  pressurePa: number; // Pascals
  baroTemp: number; // centidegrees
}

export interface MagnetometerData {
  fieldX: number; // milligauss * 3
  fieldY: number;
  fieldZ: number;
}

export interface AccelGyroData {
  sampleTime: number; // µs
  gyroX: number;
  gyroY: number;
  gyroZ: number;
  accX: number;
  accY: number;
  accZ: number;
  gyroTemp: number; // centidegrees
}

export interface LinkStatisticsData {
  puRssiAnt1: number; // dBm * -1
  puRssiAnt2: number;
  upLinkQuality: number; // percent
  upSnr: number; // dB
  activeAntenna: number;
  rfProfile: number;
  upRfPower: number;
  downRssi: number; // dBm * -1
  downLinkQuality: number; // percent
  downSnr: number; // dB
}

export interface ChannelsPacked11BitsData {
  channelTicks: number[]; // 16 raw tick values
}

export interface LinkStatisticsRxData {
  rssiDb: number; // dBm * -1
  rssiPercent: number;
  linkQuality: number; // percent
  snr: number; // dB
  rfPowerDb: number; // dBm
}

export interface LinkStatisticsTxData {
  rssiDb: number; // dBm * -1
  rssiPercent: number;
  linkQuality: number; // percent
  snr: number; // dB
  rfPowerDb: number; // dBm
  fps: number; // fps / 10
}

export interface AttitudeData {
  pitch: number; // LSB = 100 µrad
  roll: number;
  yaw: number;
}

export interface FlightModeData {
  mode: string;
}

export interface MavLinkFcData {
  airspeed: number;
  baseMode: number;
  customMode: number;
  autopilotType: number;
  firmwareType: number;
}

export interface EspNowMessageData {
  val1: number; // seat position
  val2: number; // current lap
  val3: string; // lap time
  val4: string; // lap time
  freeText: string;
}
