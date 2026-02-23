import {
  CrossfireParser,
  getFrameVariant,
  FRAME_TYPE,
  type RCChannelsPacked,
  type GPS,
  type GPSTime,
  type GPSExtended,
  type VariometerSensor,
  type BatterySensor,
  type BarometricAltitudeVerticalSpeed,
  type Airspeed,
  type Heartbeat,
  type RMP,
  type Temp,
  type Voltages,
  type VTXTelemetry,
  type Barometer,
  type Magnetometer,
  type AccelGyro,
  type LinkStatistics,
  type RCChannelsPacked11Bits,
  type LinkStatisticsRx,
  type LinkStatisticsTx,
  type Attitude,
  type MavLinkFC,
  type FlightMode,
  type EspNowMessage,
} from "crsf";
import { SensorService } from "./SensorService";
import type {
  ChannelsData,
  GpsData,
  GpsTimeData,
  GpsExtendedData,
  VariometerData,
  BatteryData,
  BaroAltVertSpeedData,
  AirspeedData,
  HeartbeatData,
  RpmData,
  TempData,
  VoltagesData,
  VtxTelemetryData,
  BarometerData,
  MagnetometerData,
  AccelGyroData,
  LinkStatisticsData,
  ChannelsPacked11BitsData,
  LinkStatisticsRxData,
  LinkStatisticsTxData,
  AttitudeData,
  FlightModeData,
  MavLinkFcData,
  EspNowMessageData,
} from "./telemetry-types";

const STALE_CHECK_INTERVAL = 2000;
const STALE_THRESHOLD = 3000;

export class TelemetryService {
  readonly gps = new SensorService<GpsData>();
  readonly gpsTime = new SensorService<GpsTimeData>();
  readonly gpsExtended = new SensorService<GpsExtendedData>();
  readonly variometer = new SensorService<VariometerData>();
  readonly battery = new SensorService<BatteryData>();
  readonly baroAltVertSpeed = new SensorService<BaroAltVertSpeedData>();
  readonly airspeed = new SensorService<AirspeedData>();
  readonly heartbeat = new SensorService<HeartbeatData>();
  readonly rpm = new SensorService<RpmData>();
  readonly temp = new SensorService<TempData>();
  readonly voltages = new SensorService<VoltagesData>();
  readonly vtxTelemetry = new SensorService<VtxTelemetryData>();
  readonly barometer = new SensorService<BarometerData>();
  readonly magnetometer = new SensorService<MagnetometerData>();
  readonly accelGyro = new SensorService<AccelGyroData>();
  readonly linkStatistics = new SensorService<LinkStatisticsData>();
  readonly channels = new SensorService<ChannelsData>();
  readonly channelsPacked11Bits = new SensorService<ChannelsPacked11BitsData>();
  readonly linkStatisticsRx = new SensorService<LinkStatisticsRxData>();
  readonly linkStatisticsTx = new SensorService<LinkStatisticsTxData>();
  readonly attitude = new SensorService<AttitudeData>();
  readonly flightMode = new SensorService<FlightModeData>();
  readonly mavLinkFc = new SensorService<MavLinkFcData>();
  readonly espNowMessage = new SensorService<EspNowMessageData>();

  private readonly allSensors: Pick<
    SensorService<unknown>,
    "reset" | "markStale" | "state"
  >[] = [
    this.gps,
    this.gpsTime,
    this.gpsExtended,
    this.variometer,
    this.battery,
    this.baroAltVertSpeed,
    this.airspeed,
    this.heartbeat,
    this.rpm,
    this.temp,
    this.voltages,
    this.vtxTelemetry,
    this.barometer,
    this.magnetometer,
    this.accelGyro,
    this.linkStatistics,
    this.channels,
    this.channelsPacked11Bits,
    this.linkStatisticsRx,
    this.linkStatisticsTx,
    this.attitude,
    this.flightMode,
    this.mavLinkFc,
    this.espNowMessage,
  ];

  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private staleTimer: ReturnType<typeof setInterval> | null = null;

  async start(readable: ReadableStream<Uint8Array>): Promise<void> {
    const parser = new CrossfireParser((frame) => {
      const variant = getFrameVariant(frame);
      switch (variant.frameType) {
        case FRAME_TYPE.GPS: {
          const v = variant as GPS;
          this.gps.update({
            latitude: v.latitude,
            longitude: v.longitude,
            groundSpeed: v.groundSpeed,
            heading: v.heading,
            altitude: v.altitude,
            satellites: v.satellites,
          });
          break;
        }
        case FRAME_TYPE.GPS_TIME: {
          const v = variant as GPSTime;
          this.gpsTime.update({
            year: v.year,
            month: v.month,
            day: v.day,
            hour: v.hour,
            minute: v.minute,
            second: v.second,
            millisecond: v.millisecond,
          });
          break;
        }
        case FRAME_TYPE.GPS_EXTENDED: {
          const v = variant as GPSExtended;
          this.gpsExtended.update({
            fixType: v.fixType,
            nSpeed: v.nSpeed,
            eSpeed: v.eSpeed,
            vSpeed: v.vSpeed,
            hSpeedAcc: v.hSpeedAcc,
            trackAcc: v.trackAcc,
            altEllipsoid: v.altEllipsoid,
            hAcc: v.hAcc,
            vAcc: v.vAcc,
            reserved: v.reserved,
            hDOP: v.hDOP,
            vDOP: v.vDOP,
          });
          break;
        }
        case FRAME_TYPE.VARIOMETER_SENSOR: {
          const v = variant as VariometerSensor;
          this.variometer.update({ vSpeed: v.vSpeed });
          break;
        }
        case FRAME_TYPE.BATTERY_SENSOR: {
          const v = variant as BatterySensor;
          this.battery.update({
            voltage: v.voltage,
            current: v.current,
            capacityUsed: v.capacityUsed,
            remaining: v.remaining,
          });
          break;
        }
        case FRAME_TYPE.BAROMETRIC_ALTITUDE_VERTICAL_SPEED: {
          const v = variant as BarometricAltitudeVerticalSpeed;
          this.baroAltVertSpeed.update({
            altitudePacked: v.altitudePacked,
            verticalSpeedPacked: v.verticalSpeedPacked,
          });
          break;
        }
        case FRAME_TYPE.AIRSPEED: {
          const v = variant as Airspeed;
          this.airspeed.update({ speed: v.speed });
          break;
        }
        case FRAME_TYPE.HEARTBEAT: {
          const v = variant as Heartbeat;
          this.heartbeat.update({ originAddress: v.originAddress });
          break;
        }
        case FRAME_TYPE.RPM: {
          const v = variant as RMP;
          this.rpm.update({
            rpmSourceId: v.rpmSourceId,
            rpmValues: [...v.rpmValues],
          });
          break;
        }
        case FRAME_TYPE.TEMP: {
          const v = variant as Temp;
          this.temp.update({
            tempSourceId: v.tempSourceId,
            temperatures: [...v.temperatures],
          });
          break;
        }
        case FRAME_TYPE.VOLTAGES: {
          const v = variant as Voltages;
          this.voltages.update({
            sourceId: v.sourceId,
            voltages: [...v.voltages],
          });
          break;
        }
        case FRAME_TYPE.VTX_TELEMETRY: {
          const v = variant as VTXTelemetry;
          this.vtxTelemetry.update({
            originAddress: v.originAddress,
            powerDbm: v.powerDbm,
            frequencyMhz: v.frequencyMhz,
            pitMode: v.pitMode,
            pitModeControl: v.pitModeControl,
            pitModeSwitch: v.pitModeSwitch,
          });
          break;
        }
        case FRAME_TYPE.BAROMETER: {
          const v = variant as Barometer;
          this.barometer.update({
            pressurePa: v.pressurePa,
            baroTemp: v.baroTemp,
          });
          break;
        }
        case FRAME_TYPE.MAGNETOMETER: {
          const v = variant as Magnetometer;
          this.magnetometer.update({
            fieldX: v.fieldX,
            fieldY: v.fieldY,
            fieldZ: v.fieldZ,
          });
          break;
        }
        case FRAME_TYPE.ACCEL_GYRO: {
          const v = variant as AccelGyro;
          this.accelGyro.update({
            sampleTime: v.sampleTime,
            gyroX: v.gyroX,
            gyroY: v.gyroY,
            gyroZ: v.gyroZ,
            accX: v.accX,
            accY: v.accY,
            accZ: v.accZ,
            gyroTemp: v.gyroTemp,
          });
          break;
        }
        case FRAME_TYPE.LINK_STATISTICS: {
          const v = variant as LinkStatistics;
          this.linkStatistics.update({
            puRssiAnt1: v.puRssiAnt1,
            puRssiAnt2: v.puRssiAnt2,
            upLinkQuality: v.upLinkQuality,
            upSnr: v.upSnr,
            activeAntenna: v.activeAntenna,
            rfProfile: v.rfProfile,
            upRfPower: v.upRfPower,
            downRssi: v.downRssi,
            downLinkQuality: v.downLinkQuality,
            downSnr: v.downSnr,
          });
          break;
        }
        case FRAME_TYPE.RC_CHANNELS_PACKED: {
          const rc = variant as RCChannelsPacked;
          this.channels.update({
            channels: [
              rc.channel1,
              rc.channel2,
              rc.channel3,
              rc.channel4,
              rc.channel5,
              rc.channel6,
              rc.channel7,
              rc.channel8,
              rc.channel9,
              rc.channel10,
              rc.channel11,
              rc.channel12,
              rc.channel13,
              rc.channel14,
              rc.channel15,
              rc.channel16,
            ],
          });
          break;
        }
        case FRAME_TYPE.RC_CHANNELS_PACKED_11_BITS: {
          const v = variant as RCChannelsPacked11Bits;
          this.channelsPacked11Bits.update({
            channelTicks: [
              v.channel1Ticks,
              v.channel2Ticks,
              v.channel3Ticks,
              v.channel4Ticks,
              v.channel5Ticks,
              v.channel6Ticks,
              v.channel7Ticks,
              v.channel8Ticks,
              v.channel9Ticks,
              v.channel10Ticks,
              v.channel11Ticks,
              v.channel12Ticks,
              v.channel13Ticks,
              v.channel14Ticks,
              v.channel15Ticks,
              v.channel16Ticks,
            ],
          });
          break;
        }
        case FRAME_TYPE.LINK_STATISTICS_RX: {
          const v = variant as LinkStatisticsRx;
          this.linkStatisticsRx.update({
            rssiDb: v.rssiDb,
            rssiPercent: v.rssiPercent,
            linkQuality: v.linkQuality,
            snr: v.snr,
            rfPowerDb: v.rfPowerDb,
          });
          break;
        }
        case FRAME_TYPE.LINK_STATISTICS_TX: {
          const v = variant as LinkStatisticsTx;
          this.linkStatisticsTx.update({
            rssiDb: v.rssiDb,
            rssiPercent: v.rssiPercent,
            linkQuality: v.linkQuality,
            snr: v.snr,
            rfPowerDb: v.rfPowerDb,
            fps: v.fps,
          });
          break;
        }
        case FRAME_TYPE.ATTITUDE: {
          const v = variant as Attitude;
          this.attitude.update({
            pitch: v.pitch,
            roll: v.roll,
            yaw: v.yaw,
          });
          break;
        }
        case FRAME_TYPE.FLIGHT_MODE: {
          const v = variant as FlightMode;
          this.flightMode.update({ mode: v.mode });
          break;
        }
        case FRAME_TYPE.MAV_LINK_FC: {
          const v = variant as MavLinkFC;
          this.mavLinkFc.update({
            airspeed: v.airspeed,
            baseMode: v.baseMode,
            customMode: v.customMode,
            autopilotType: v.autopilotType,
            firmwareType: v.firmwareType,
          });
          break;
        }
        case FRAME_TYPE.ESP_NOW_MESSAGE: {
          const v = variant as EspNowMessage;
          this.espNowMessage.update({
            val1: v.val1,
            val2: v.val2,
            val3: v.val3,
            val4: v.val4,
            freeText: v.freeText,
          });
          break;
        }
      }
    });

    this.reader = readable.getReader();
    this.startStaleTimer();

    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;
        parser.appendChunk(value);
      }
    } catch {
      // Reader was cancelled or port disconnected
    }
  }

  stop(): void {
    if (this.reader) {
      this.reader.cancel();
      this.reader = null;
    }
    this.stopStaleTimer();
    for (const sensor of this.allSensors) {
      sensor.reset();
    }
  }

  private startStaleTimer(): void {
    this.staleTimer = setInterval(() => {
      const now = Date.now();
      for (const sensor of this.allSensors) {
        const { status, lastUpdated } = sensor.state;
        if (status === "active" && now - lastUpdated > STALE_THRESHOLD) {
          sensor.markStale();
        }
      }
    }, STALE_CHECK_INTERVAL);
  }

  private stopStaleTimer(): void {
    if (this.staleTimer !== null) {
      clearInterval(this.staleTimer);
      this.staleTimer = null;
    }
  }
}
