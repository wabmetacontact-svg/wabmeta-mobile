declare module "events" {
  export class EventEmitter {
    static defaultMaxListeners: number;
    setMaxListeners(n: number): this;
    getMaxListeners(): number;
    emit(event: string | symbol, ...args: any[]): boolean;
    addListener(event: string | symbol, listener: (...args: any[]) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;
    removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
    off(event: string | symbol, listener: (...args: any[]) => void): this;
    removeAllListeners(event?: string | symbol): this;
    listeners(event: string | symbol): Function[];
    rawListeners(event: string | symbol): Function[];
    listenerCount(event: string | symbol): number;
    eventNames(): Array<string | symbol>;
  }
}

declare module "expo-router" {
  export const Stack: any;
  export const Tabs: any;
  export const Slot: any;
  export const router: any;
  export const useRouter: any;
  export const useLocalSearchParams: <T = any>() => T;
  export const useGlobalSearchParams: <T = any>() => T;
  export const usePathname: () => string;
  export const useSegments: () => string[];
  export const Link: any;
  export const Redirect: any;
  export const SplashScreen: any;
  export const ErrorBoundary: any;
}

declare module "react-native-gesture-handler" {
  import { ComponentType } from "react";
  import { ViewProps } from "react-native";
  export const GestureHandlerRootView: ComponentType<ViewProps>;
  export const TouchableOpacity: any;
  export const TouchableHighlight: any;
  export const TouchableWithoutFeedback: any;
  export const ScrollView: any;
  export const FlatList: any;
  export const Swipeable: any;
  export const RectButton: any;
  export const BorderlessButton: any;
  export const BaseButton: any;
  export const State: any;
  export const Directions: any;
  export const Gesture: any;
  export const GestureDetector: any;
}
