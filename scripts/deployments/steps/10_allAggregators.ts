import {BigNumber, constants} from "ethers";
import {
  deployNFTFloorPriceOracle,
  deployParaSpaceOracle,
  deployProtocolDataProvider,
  deployUiPoolDataProvider,
  deployWalletBalanceProvider,
} from "../../../helpers/contracts-deployments";
import {
  getAllERC721Tokens,
  getAllTokens,
  getPoolAddressesProvider,
  getPriceOracle,
} from "../../../helpers/contracts-getters";
import {getEthersSignersAddresses} from "../../../helpers/contracts-helpers";
import {GLOBAL_OVERRIDES} from "../../../helpers/hardhat-constants";
import {
  getParaSpaceConfig,
  isMoonbeam,
  waitForTx,
} from "../../../helpers/misc-utils";
import {
  deployAllAggregators,
  getPairsTokenAggregators,
} from "../../../helpers/oracles-helpers";
import {
  ERC20TokenContractId,
  ERC721TokenContractId,
} from "../../../helpers/types";

export const deployNftOracle = async (verify = false) => {
  const erc721Tokens = await getAllERC721Tokens();
  const paraSpaceConfig = getParaSpaceConfig();
  const oracleConfig = paraSpaceConfig.Oracle;
  const chainlinkConfig = paraSpaceConfig.Chainlink;
  // UniswapV3 should use price from `UniswapV3OracleWrapper` instead of NFTFloorOracle
  delete erc721Tokens[ERC721TokenContractId.UniswapV3];
  const [deployer, oracle1, oracle2, oracle3] =
    await getEthersSignersAddresses();
  //at launch phase we will only use 3 feeders for nft oracle in mainnet
  const feeders =
    oracleConfig.Nodes.length > 0
      ? oracleConfig.Nodes
      : [oracle1, oracle2, oracle3];
  const projects = Object.entries(erc721Tokens)
    .filter(([symbol]) => !Object.keys(chainlinkConfig).includes(symbol))
    .map(([, nft]) => nft.address);
  const nftFloorOracle = await deployNFTFloorPriceOracle(verify);
  await waitForTx(
    await nftFloorOracle.initialize(
      deployer,
      feeders,
      projects,
      GLOBAL_OVERRIDES
    )
  );
  return nftFloorOracle;
};

export const step_10 = async (verify = false) => {
  try {
    const allTokens = await getAllTokens();
    const addressesProvider = await getPoolAddressesProvider();
    const fallbackOracle = await getPriceOracle();
    const chainlinkConfig = getParaSpaceConfig().Chainlink;

    const nftFloorOracle = await deployNftOracle(verify);

    const [allTokenAddresses, allAggregatorsAddresses] =
      await deployAllAggregators(
        nftFloorOracle.address,
        getParaSpaceConfig().Mocks?.AllAssetsInitialPrices,
        verify
      );

    const [tokens, aggregators] = getPairsTokenAggregators(
      allTokenAddresses,
      allAggregatorsAddresses
    );

    const paraspaceOracle = await deployParaSpaceOracle(
      [
        addressesProvider.address,
        tokens,
        aggregators,
        fallbackOracle.address,
        isMoonbeam() ? allTokens.USDC.address : allTokens.WETH.address,
        isMoonbeam()
          ? BigNumber.from("100000000").toString()
          : constants.WeiPerEther.toString(),
      ],
      verify
    );
    await waitForTx(
      await addressesProvider.setPriceOracle(
        paraspaceOracle.address,
        GLOBAL_OVERRIDES
      )
    );

    const protocolDataProvider = await deployProtocolDataProvider(
      addressesProvider.address,
      verify
    );
    await addressesProvider.setProtocolDataProvider(
      protocolDataProvider.address,
      GLOBAL_OVERRIDES
    );

    if (!isMoonbeam()) {
      await deployUiPoolDataProvider(
        (chainlinkConfig.WETH ||
          allAggregatorsAddresses[ERC20TokenContractId.USDT])!,
        (chainlinkConfig.WETH ||
          allAggregatorsAddresses[ERC20TokenContractId.USDC])!,
        verify
      );
    } else {
      await deployUiPoolDataProvider(
        chainlinkConfig.USDC!,
        chainlinkConfig.USDC!,
        verify
      );
    }
    await deployWalletBalanceProvider(verify);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
