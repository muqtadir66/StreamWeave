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
                // Avoid auto-connecting MetaMask Standard Wallet because it can be flaky / duplicated
                // (and can get "stuck" if it was the last-selected wallet in localStorage).
                autoConnect={(adapter) => adapter?.name !== 'MetaMask'}
                onError={(err, adapter) => {
                    console.error('[WalletAdapter]', err, adapter);
                    if (adapter?.name === 'MetaMask') {
                        try {
                            localStorage.removeItem('streamweaveWalletName');
                        } catch {}
                    }
                }}
                localStorageKey="streamweaveWalletName"
            >
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
