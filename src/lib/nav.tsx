import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { ScreenStack, ScreenStackItem } from 'react-native-screens';

export type Route = { name: 'Home' } | { name: 'Note'; id: string; fresh?: boolean };

type Nav = {
  push: (route: Route) => void;
  pop: () => void;
};

const NavContext = createContext<Nav>({ push: () => {}, pop: () => {} });
const RouteContext = createContext<Route>({ name: 'Home' });

export const useNav = () => useContext(NavContext);
export const useRoute = <T extends Route['name']>() => useContext(RouteContext) as Extract<Route, { name: T }>;

let counter = 0;

/** A minimal native stack (UINavigationController) with swipe-back, built on react-native-screens. */
export function Stack({
  render,
  background,
}: {
  render: (route: Route) => ReactNode;
  background: string;
}) {
  const [stack, setStack] = useState<{ key: string; route: Route }[]>([
    { key: 'root', route: { name: 'Home' } },
  ]);

  const nav = useMemo<Nav>(
    () => ({
      push: (route) => setStack((s) => [...s, { key: `r${++counter}`, route }]),
      pop: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
    }),
    []
  );

  return (
    <NavContext.Provider value={nav}>
      <ScreenStack style={StyleSheet.absoluteFill}>
        {stack.map(({ key, route }) => (
          <ScreenStackItem
            key={key}
            screenId={key}
            headerConfig={{ hidden: true }}
            contentStyle={{ backgroundColor: background }}
            onDismissed={(e) =>
              setStack((s) => s.slice(0, Math.max(1, s.length - e.nativeEvent.dismissCount)))
            }>
            <RouteContext.Provider value={route}>{render(route)}</RouteContext.Provider>
          </ScreenStackItem>
        ))}
      </ScreenStack>
    </NavContext.Provider>
  );
}
