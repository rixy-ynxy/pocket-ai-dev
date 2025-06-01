import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import MainScreen from './src/screens/MainScreen';

const Stack = createStackNavigator();

const App: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Main"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen 
          name="Main" 
          component={MainScreen}
          options={{
            title: 'Mobile Devin POC',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App; 