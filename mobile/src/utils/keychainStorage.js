import * as Keychain from 'react-native-keychain';
import Config from 'react-native-config';

const SERVICE_NAME = `salesflow_user_${Config.APP_ENV || 'dev'}`;

const keychainStorage = {
  getItem: async (name) => {
    try {
      const credentials = await Keychain.getGenericPassword({ service: `${SERVICE_NAME}_${name}` });
      if (credentials) {
        return credentials.password; // we store the state JSON in password
      }
      return null;
    } catch (error) {
      console.error("Keychain load error:", error.message);
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await Keychain.setGenericPassword(`${SERVICE_NAME}_${name}`, value, { service: `${SERVICE_NAME}_${name}` });
    } catch (error) {
      console.error("Keychain save error:", error.message);
    }
  },
  removeItem: async (name) => {
    try {
      await Keychain.resetGenericPassword({ service: `${SERVICE_NAME}_${name}` });
    } catch (error) {
      console.error("Keychain reset error:", error.message);
    }
  },
};

export default keychainStorage;
