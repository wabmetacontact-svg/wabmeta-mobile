import { Redirect } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { AppLoading } from "../src/components/common/AppLoading";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  // Pehle yahan useEffect ke andar router.replace() tha. Wo imperative call
  // tab silently drop ho jati hai jab root navigator abhi mount nahi hua -
  // aur screen isi placeholder par atak jati thi. <Redirect> declarative hai:
  // expo-router use tab tak hold karta hai jab tak navigate karna safe na ho.
  if (isLoading) {
    return <AppLoading />;
  }

  return (
    <Redirect href={isAuthenticated ? "/(app)/(tabs)" : "/(auth)/login"} />
  );
}
