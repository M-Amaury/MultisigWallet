'use client';

import '@rainbow-me/rainbowkit/styles.css';
import {getDefaultConfig, RainbowKitProvider, darkTheme} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import {QueryClientProvider,QueryClient} from "@tanstack/react-query";

const config = getDefaultConfig({
  appName: 'App',
  projectId: 'accddf1c6272a93662df41f7bfa710df',
  chains: [arbitrumSepolia],
  ssr: true, // Si votre application utilise le rendu côté serveur
});

const queryClient = new QueryClient();

const CustomProvider = ({children}) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({...darkTheme.accentColors.blue})}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default CustomProvider;