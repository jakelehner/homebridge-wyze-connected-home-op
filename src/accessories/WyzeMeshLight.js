const { Service, Characteristic } = require('../types');
const WyzeAccessory = require('./WyzeAccessory');
const convert = require('color-convert');

const WYZE_API_POWER_PROPERTY = 'P3';
const WYZE_API_ONLINE_PROPERTY = 'P5';
const WYZE_API_BRIGHTNESS_PROPERTY = 'P1501';
const WYZE_API_COLOR_TEMP_PROPERTY = 'P1502';
const WYZE_API_REMAINING_TIME = 'P1505';
const WYZE_API_AWAY_MODE = 'P1506';
const WYZE_API_COLOR_PROPERTY = 'P1507';
const WYZE_API_COLOR_LIGHT = 'P1508';
const WYZE_API_POWER_LOSS_RECOVERY = 'P1509';
const WYZE_API_DELAY_OFF = 'P1510';

const WYZE_ACTION_KEY = 'set_mesh_property';

const WYZE_COLOR_TEMP_MIN = 1800;
const WYZE_COLOR_TEMP_MAX = 6500;
const HOMEKIT_COLOR_TEMP_MIN = 500;
const HOMEKIT_COLOR_TEMP_MAX = 140;

module.exports = class WyzeMeshLight extends WyzeAccessory {
  constructor(plugin, homeKitAccessory) {
    super(plugin, homeKitAccessory);

    this.getCharacteristic(Characteristic.On).on('set', this.setOn.bind(this));
    this.getCharacteristic(Characteristic.Brightness).on('set', this.setBrightness.bind(this));
    this.getCharacteristic(Characteristic.ColorTemperature).on('set', this.setColorTemperature.bind(this));
    this.getCharacteristic(Characteristic.Hue).on('set', this.setColor.bind(this));
  }

  async updateCharacteristics(device) {
    this.getCharacteristic(Characteristic.On).updateValue(device.device_params.switch_state);

    let propertyList = await this.getPropertyList();
    for (let property of propertyList.data.property_list) {
      switch (property.pid) {
        case WYZE_API_BRIGHTNESS_PROPERTY:
          this.updateBrightness(property.value);
          break;

        case WYZE_API_COLOR_TEMP_PROPERTY:
          this.updateColorTemp(property.value);
          break;
    
        case WYZE_API_COLOR_PROPERTY:
          this.updateColor(property.value);
          break;
      }
    }
  }

  updateBrightness(value) {
    this.getCharacteristic(Characteristic.Brightness).updateValue(value);
  }

  updateColorTemp(value) {
    let floatValue = this._rangeToFloat(value, WYZE_COLOR_TEMP_MIN, WYZE_COLOR_TEMP_MAX);
    let homeKitValue = this._floatToRange(floatValue, HOMEKIT_COLOR_TEMP_MIN, HOMEKIT_COLOR_TEMP_MAX);
    this.getCharacteristic(Characteristic.ColorTemperature).updateValue(homeKitValue);
  }

  updateColor(value) {
    var convert = require('color-convert');

    this.plugin.log.info('MeshLight: updateColor ' + value);
    this.plugin.log.info('Converted: ' + convert.hex.hsv(value));
    this.plugin.log.info('Converted Hue: ' + convert.hex.hsv(value).h);
    this.getCharacteristic(Characteristic.Hue).updateValue(convert.hex.hsv(value).h);
  }

  getService() {
    let service = this.homeKitAccessory.getService(Service.Lightbulb);

    if (!service) {
      service = this.homeKitAccessory.addService(Service.Lightbulb);
    }

    return service;
  }

  getCharacteristic(characteristic) {
    return this.getService().getCharacteristic(characteristic);
  }

  async setOn(value, callback) {
    this.plugin.log.info(`Setting power for ${this.homeKitAccessory.context.mac} (${this.homeKitAccessory.context.nickname}) to ${value}`);

    let actions = [
      {
        pid: WYZE_API_POWER_PROPERTY,
        pvalue: (value) ? '1' : '0'
      }
    ];

    try {
      await this.runActions(actions, WYZE_ACTION_KEY);
      callback();
    } catch (e) {
      callback(e);
    }
  }

  async setBrightness(value, callback) {
    this.plugin.log.info(`Setting brightness for ${this.homeKitAccessory.context.mac} (${this.homeKitAccessory.context.nickname}) to ${value}`);

    let actions = [
      {
        pid: WYZE_API_BRIGHTNESS_PROPERTY,
        pvalue: value
      }
    ];
    
    try {
      await this.runActions(actions, WYZE_ACTION_KEY);
      callback();
    } catch (e) {
      callback(e);
    }
  }

  async setColorTemperature(value, callback) {
    let floatValue = this._rangeToFloat(value, HOMEKIT_COLOR_TEMP_MIN, HOMEKIT_COLOR_TEMP_MAX);
    let wyzeValue = this._floatToRange(floatValue, WYZE_COLOR_TEMP_MIN, WYZE_COLOR_TEMP_MAX);

    this.plugin.log.info(`Setting color temperature for ${this.homeKitAccessory.context.mac} (${this.homeKitAccessory.context.nickname}) to ${value} (${wyzeValue})`);

    let actions = [
      {
        pid: WYZE_API_COLOR_PROPERTY,
        pvalue: '000000'
      },
      {
        pid: WYZE_API_COLOR_TEMP_PROPERTY,
        pvalue: value
      }
    ];

    try {
      await this.runActions(actions, WYZE_ACTION_KEY);
      callback();
    } catch (e) {
      this.plugin.log.info('error');
      this.plugin.log.info(e);
      callback(e);
    }
  }

  async setColor(value, callback) {
    var convert = require('color-convert');

    let wyzeValue = convert.hsv.hex(value);
    
    this.plugin.log.info(`Setting color for ${this.homeKitAccessory.context.mac} (${this.homeKitAccessory.context.nickname}) to ${value} (${wyzeValue})`);

    this.plugin.log.info('MeshLight: setColor ' + value);
    this.plugin.log.info('Converted: ' + convert.hsv.hex(value));

    let actions = [
      {
        pid: WYZE_API_COLOR_PROPERTY,
        pvalue: convert.hsv.hex(value)
      }
    ];

    try {
      await this.runActions(actions, WYZE_ACTION_KEY);
      this.plugin.log.info('success');
      callback();
    } catch (e) {
      callback(e);
    }
  }

  _rangeToFloat(value, min, max) {
    return (value - min) / (max - min);
  }

  _floatToRange(value, min, max) {
    return Math.round((value * (max - min)) + min);
  }

};
