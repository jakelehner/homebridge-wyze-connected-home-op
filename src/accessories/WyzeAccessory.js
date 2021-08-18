const { Service, Characteristic } = require('../types');

// Responses from the Wyze API can lag a little after a new value is set
const UPDATE_THROTTLE_MS = 1000;

module.exports = class WyzeAccessory {
  constructor(plugin, homeKitAccessory) {
    this.updating = false;
    this.lastTimestamp = null;

    this.plugin = plugin;
    this.homeKitAccessory = homeKitAccessory;
  }
  
  get display_name() {
    return this.homeKitAccessory.displayName;
  }

  get mac() {
    return this.homeKitAccessory.context.mac;
  }

  get product_type() {
    return this.homeKitAccessory.context.product_type;
  }

  get product_model() {
    return this.homeKitAccessory.context.product_model;
  }

  /** Determines whether this accessory matches the given Wyze device */
  matches(device) {
    return this.mac === device.mac;
  }

  async update(device, timestamp) {
    this.homeKitAccessory.context = {
      mac: device.mac,
      product_type: device.product_type,
      product_model: device.product_model,
      nickname: device.nickname,
    };

    this.homeKitAccessory.getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Name, device.nickname)
      .setCharacteristic(Characteristic.Manufacturer, 'Wyze')
      .setCharacteristic(Characteristic.Model, device.product_model)
      .setCharacteristic(Characteristic.SerialNumber, device.mac);

    if (this.shouldUpdateCharacteristics(timestamp)) {
      await this.updateCharacteristics(device);
    }
  }

  shouldUpdateCharacteristics(timestamp) {
    if (this.updating) {
      return false;
    }

    if (this.lastTimestamp && timestamp <= (this.lastTimestamp + UPDATE_THROTTLE_MS)) {
      return false;
    }

    return true;
  }

  updateCharacteristics(device) {
    //
  }

  convertColorFromWyze_HEXHSB_ToHomeKit(value) {
    const [, h, s, b] = (value || '0000000000ffff').match(/^.{6}([0-9a-f]{4})([0-9a-f]{2})([0-9a-f]{2})$/i) || [0, '0', 'ff', 'ff'];
    return {
        h: parseInt(h, 16),
        s: Math.round(parseInt(s, 16) / 2.55),
        b: Math.round(parseInt(b, 16) / 2.55)
    };
}

  async getPropertyList() {
    let response = await this.plugin.client.getPropertyList(this.mac, this.product_model);

    return response;
  }

  async setProperty(property, value) {
    try {
      this.updating = true;

      let response = await this.plugin.client.setProperty(this.mac, this.product_model, property, value);

      this.lastTimestamp = response.ts;
    } finally {
      this.updating = false;
    }
  }

  async runActions(actions, actionKey) {
    this.plugin.log.info({property, value, actionKey});
    try {
      this.updating = true;

      let response = await this.plugin.client.runActions(this.mac, this.product_model, actions, actionKey);

      this.lastTimestamp = response.ts;
    } finally {
      this.updating = false;
    }
  }
};
