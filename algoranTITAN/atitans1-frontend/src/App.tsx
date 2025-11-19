
import { SupportedWallet, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider } from 'notistack'
import EnhancedHome from './pages/EnhancedHome'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'
import AdaptiveWalletProvider from './contexts/AdaptiveWalletContext'
import { ApplicationProvider } from './contexts/ApplicationContext'

let supportedWallets: SupportedWallet[]

if (import.meta.env.VITE_ALGOD_NETWORK === 'localnet') {
  // LocalNet configuration - includes KMD for development
  const kmdConfig = getKmdConfigFromViteEnvironment()
  supportedWallets = [
    { id: WalletId.LUTE },
    {
      id: WalletId.KMD,
      options: {
        baseServer: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ]
} else {
  // TestNet/MainNet configuration - includes Lute and popular wallets
  supportedWallets = [
    { id: WalletId.LUTE },
    { id: WalletId.DEFLY },
    { id: WalletId.PERA },
    { id: WalletId.EXODUS },
    // If you are interested in WalletConnect v2 provider
    // refer to https://github.com/TxnLab/use-wallet for detailed integration instructions
  ]
}

export default function App() {
  const algodConfig = getAlgodConfigFromViteEnvironment()
  
  // Configure wallet manager with proxy for LocalNet, direct connection for TestNet/MainNet
  const walletNetworkConfig = algodConfig.network === 'localnet' && typeof window !== 'undefined'
    ? {
        // LocalNet configuration with proxy
        baseServer: `${window.location.origin}/api/algod`,
        port: '',
        token: String(algodConfig.token),
      }
    : {
        // TestNet/MainNet configuration - direct connection
        baseServer: algodConfig.server,
        port: algodConfig.port || '',
        token: String(algodConfig.token || ''),
      };

  const walletManager = new WalletManager({
    wallets: supportedWallets,
    defaultNetwork: algodConfig.network,
    networks: {
      [algodConfig.network]: {
        algod: walletNetworkConfig,
      },
    },
    options: {
      resetNetwork: true,
    },
  })

  return (
    <SnackbarProvider maxSnack={3}>
      <WalletProvider manager={walletManager}>
        <AdaptiveWalletProvider>
          <ApplicationProvider>
            <EnhancedHome />
          </ApplicationProvider>
        </AdaptiveWalletProvider>
      </WalletProvider>
    </SnackbarProvider>
  )
}
