const { Service, Characteristic } = require('../types');
const WyzeAccessory = require('./WyzeLight');

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

const WYZE_COLOR_TEMP_MIN = 1800;
const WYZE_COLOR_TEMP_MAX = 6500;
const HOMEKIT_COLOR_TEMP_MIN = 500;
const HOMEKIT_COLOR_TEMP_MAX = 140;

module.exports = class WyzeMeshLight extends WyzeLight {
  constructor(plugin, homeKitAccessory) {
    super(plugin, homeKitAccessory);

    this.getCharacteristic(Characteristic.Hue).on('set', this.setColor.bind(this));
  }

  async updateCharacteristics(device) {
    super(device);

    for (let property of propertyList.data.property_list) {
      switch (property.pid) {
        case WYZE_API_COLOR_PROPERTY:
          this.updateColor(property.value);
          break;
      }
    }
  }

  updateColor(value) {
    this.plugin.log.info('MeshLight: updateColor ' + value);
    this.plugin.log.info('Converted: ' + this.convertColorFromWyze_HEXHSB_ToHomeKit(value));
    this.getCharacteristic(Characteristic.Hue).updateValue(1);
  }

  async setColor(value, callback) {
    this.plugin.log.info(`Setting color for ${this.homeKitAccessory.context.mac} (${this.homeKitAccessory.context.nickname}) to ${value}`);

    try {
      // await this.setProperty(WYZE_API_COLOR_PROPERTY, value);
      await this.setProperty(WYZE_API_COLOR_PROPERTY, value);
      callback();
    } catch (e) {
      callback(e);
    }
  }

};
