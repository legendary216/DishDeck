import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

// 1. Zest (Orange - Default)
const OrangeTheme = {
  ...DefaultTheme,
  name: 'Zest Orange',
  colors: {
    ...DefaultTheme.colors,
    primary: '#D84315', onPrimary: '#FFFFFF',
    primaryContainer: '#FFDBcf', onPrimaryContainer: '#3E1C00',
    secondaryContainer: '#FFDACC', onSecondaryContainer: '#2C1512',
    background: '#FFF8F6', surfaceVariant: '#F5DED8', outline: '#85736E',
  },
};

// 2. Fresh (Sage Green)
const GreenTheme = {
  ...DefaultTheme,
  name: 'Fresh Sage',
  colors: {
    ...DefaultTheme.colors,
    primary: '#2E7D32', onPrimary: '#FFFFFF',
    primaryContainer: '#B9F6CA', onPrimaryContainer: '#00210B',
    secondaryContainer: '#D9E7CB', onSecondaryContainer: '#131F0D',
    background: '#FBFDF9', surfaceVariant: '#DCE5DD', outline: '#72796F',
  },
};

// 3. Ocean (Teal Blue)
const BlueTheme = {
  ...DefaultTheme,
  name: 'Ocean Blue',
  colors: {
    ...DefaultTheme.colors,
    primary: '#006978', onPrimary: '#FFFFFF',
    primaryContainer: '#A6EEFF', onPrimaryContainer: '#001F25',
    secondaryContainer: '#CCE8E6', onSecondaryContainer: '#051F23',
    background: '#F5FCFF', surfaceVariant: '#DBE4E6', outline: '#70797C',
  },
};

// 4. Berry (Crimson Red)
const RedTheme = {
  ...DefaultTheme,
  name: 'Berry Red',
  colors: {
    ...DefaultTheme.colors,
    primary: '#B71C1C', onPrimary: '#FFFFFF',
    primaryContainer: '#FFDAD6', onPrimaryContainer: '#410002',
    secondaryContainer: '#FFDAD6', onSecondaryContainer: '#2C1512',
    background: '#FFF8F7', surfaceVariant: '#F5DDDA', outline: '#857371',
  },
};

// Export the list so we can cycle through it
export const THEMES = [OrangeTheme, GreenTheme, BlueTheme, RedTheme];