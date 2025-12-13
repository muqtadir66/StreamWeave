import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';

export const SolanaProvider = ({ children }) => {
    // We start on Devnet for testing. Switch to 'Mainnet' later.
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    // We keep Wallet Standard support (WalletProvider injects those automatically),
    // but ALSO provide explicit Phantom/Solflare adapters as a fallback because
    // StandardWalletAdapter.connect can be flaky in some dev/proxy setups.
    //
    // WalletProvider will automatically filter these out if a Standard wallet with the same name is present.
    const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider
                wallets={wallets}
                autoConnect={true}
                onError={(err) => console.error('[WalletAdapter]', err)}
                localStorageKey="streamweaveWalletName"
            >
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
