import {
  getACLManager,
  getAutoCompoundApe,
  getConduit,
  getConduitController,
  getFirstSigner,
  getInitializableAdminUpgradeabilityProxy,
  getNFTFloorOracle,
  getPausableZoneController,
  getPoolAddressesProvider,
  getPoolAddressesProviderRegistry,
  getReservesSetupHelper,
  getWETHGatewayProxy,
  getWPunkGatewayProxy,
} from "../../../helpers/contracts-getters";
import {
  getContractAddressInDb,
  getParaSpaceAdmins,
} from "../../../helpers/contracts-helpers";
import {DRY_RUN, GLOBAL_OVERRIDES} from "../../../helpers/hardhat-constants";
import {waitForTx} from "../../../helpers/misc-utils";
import {eContractid} from "../../../helpers/types";

export const step_20 = async (
  // eslint-disable-next-line
  verify = false,
  admins?: {
    paraSpaceAdminAddress: string;
    gatewayAdminAddress: string;
    riskAdminAddress: string;
  }
) => {
  const {paraSpaceAdminAddress, gatewayAdminAddress, riskAdminAddress} =
    admins || (await getParaSpaceAdmins());
  const deployer = await getFirstSigner();
  const deployerAddress = await deployer.getAddress();

  try {
    const addressesProviderRegistry = await getPoolAddressesProviderRegistry();
    const addressesProvider = await getPoolAddressesProvider();
    const reservesSetupHelper = await getReservesSetupHelper();
    const conduitController = await getConduitController();
    const conduit = await getConduit();
    const zoneController = await getPausableZoneController();
    const aclManager = await getACLManager();

    console.log("new paraSpaceAdmin: ", paraSpaceAdminAddress);
    console.log("new gatewayAdmin: ", gatewayAdminAddress);
    console.log("new riskAdmin: ", riskAdminAddress);
    if (deployerAddress === paraSpaceAdminAddress) {
      return;
    }

    ////////////////////////////////////////////////////////////////////////////////
    // PoolAddressesProviderRegistry & PoolAddressesProvider
    ////////////////////////////////////////////////////////////////////////////////
    console.time("transferring addressesProvider ownership...");
    if (DRY_RUN) {
      const encodedData1 =
        addressesProviderRegistry.interface.encodeFunctionData(
          "transferOwnership",
          [paraSpaceAdminAddress]
        );
      console.log(`hex: ${encodedData1}`);
      const encodedData2 = addressesProvider.interface.encodeFunctionData(
        "setACLAdmin",
        [paraSpaceAdminAddress]
      );
      console.log(`hex: ${encodedData2}`);
      const encodedData3 = addressesProvider.interface.encodeFunctionData(
        "transferOwnership",
        [paraSpaceAdminAddress]
      );
      console.log(`hex: ${encodedData3}`);
    } else {
      await waitForTx(
        await addressesProviderRegistry.transferOwnership(
          paraSpaceAdminAddress,
          GLOBAL_OVERRIDES
        )
      );
      await waitForTx(
        await addressesProvider.setACLAdmin(
          paraSpaceAdminAddress,
          GLOBAL_OVERRIDES
        )
      );
      await waitForTx(
        await addressesProvider.transferOwnership(
          paraSpaceAdminAddress,
          GLOBAL_OVERRIDES
        )
      );
    }
    console.timeEnd("transferring addressesProvider ownership...");

    ////////////////////////////////////////////////////////////////////////////////
    // ACLManager
    ////////////////////////////////////////////////////////////////////////////////
    console.time("transferring aclManager ownership...");
    if (DRY_RUN) {
      const encodedData1 = aclManager.interface.encodeFunctionData(
        "addPoolAdmin",
        [paraSpaceAdminAddress]
      );
      console.log(`hex: ${encodedData1}`);
      const encodedData2 = aclManager.interface.encodeFunctionData(
        "removePoolAdmin",
        [deployerAddress]
      );
      console.log(`hex: ${encodedData2}`);
      if (!(await aclManager.isAssetListingAdmin(paraSpaceAdminAddress))) {
        const encodedData3 = aclManager.interface.encodeFunctionData(
          "addAssetListingAdmin",
          [paraSpaceAdminAddress]
        );
        console.log(`hex: ${encodedData3}`);
      }
      if (await aclManager.isAssetListingAdmin(deployerAddress)) {
        const encodedData4 = aclManager.interface.encodeFunctionData(
          "removeAssetListingAdmin",
          [deployerAddress]
        );
        console.log(`hex: ${encodedData4}`);
      }
      if (!(await aclManager.isRiskAdmin(riskAdminAddress))) {
        const encodedData5 = aclManager.interface.encodeFunctionData(
          "addRiskAdmin",
          [riskAdminAddress]
        );
        console.log(`hex: ${encodedData5}`);
      }
      if (await aclManager.isRiskAdmin(deployerAddress)) {
        const encodedData6 = aclManager.interface.encodeFunctionData(
          "removeRiskAdmin",
          [deployerAddress]
        );
        console.log(`hex: ${encodedData6}`);
      }
      const encodedData7 = aclManager.interface.encodeFunctionData(
        "grantRole",
        [await aclManager.DEFAULT_ADMIN_ROLE(), paraSpaceAdminAddress]
      );
      console.log(`hex: ${encodedData7}`);
      const encodedData8 = aclManager.interface.encodeFunctionData(
        "revokeRole",
        [await aclManager.DEFAULT_ADMIN_ROLE(), deployerAddress]
      );
      console.log(`hex: ${encodedData8}`);
    } else {
      await waitForTx(
        await aclManager.addPoolAdmin(paraSpaceAdminAddress, GLOBAL_OVERRIDES)
      );
      await waitForTx(
        await aclManager.removePoolAdmin(deployerAddress, GLOBAL_OVERRIDES)
      );
      if (!(await aclManager.isAssetListingAdmin(paraSpaceAdminAddress))) {
        await waitForTx(
          await aclManager.addAssetListingAdmin(
            paraSpaceAdminAddress,
            GLOBAL_OVERRIDES
          )
        );
      }
      if (await aclManager.isAssetListingAdmin(deployerAddress)) {
        await waitForTx(
          await aclManager.removeAssetListingAdmin(
            deployerAddress,
            GLOBAL_OVERRIDES
          )
        );
      }
      if (!(await aclManager.isRiskAdmin(riskAdminAddress))) {
        await waitForTx(
          await aclManager.addRiskAdmin(riskAdminAddress, GLOBAL_OVERRIDES)
        );
      }
      if (await aclManager.isRiskAdmin(deployerAddress)) {
        await waitForTx(
          await aclManager.removeRiskAdmin(deployerAddress, GLOBAL_OVERRIDES)
        );
      }
      await waitForTx(
        await aclManager.grantRole(
          await aclManager.DEFAULT_ADMIN_ROLE(),
          paraSpaceAdminAddress,
          GLOBAL_OVERRIDES
        )
      );
      await waitForTx(
        await aclManager.revokeRole(
          await aclManager.DEFAULT_ADMIN_ROLE(),
          deployerAddress,
          GLOBAL_OVERRIDES
        )
      );
    }
    console.timeEnd("transferring aclManager ownership...");

    ////////////////////////////////////////////////////////////////////////////////
    // ReservesSetupHelper
    ////////////////////////////////////////////////////////////////////////////////
    console.time("transferring reservesSetupHelper ownership...");
    if (DRY_RUN) {
      const encodedData = reservesSetupHelper.interface.encodeFunctionData(
        "transferOwnership",
        [paraSpaceAdminAddress]
      );
      console.log(`hex: ${encodedData}`);
    } else {
      await waitForTx(
        await reservesSetupHelper.transferOwnership(
          paraSpaceAdminAddress,
          GLOBAL_OVERRIDES
        )
      );
    }
    console.timeEnd("transferring reservesSetupHelper ownership...");

    ////////////////////////////////////////////////////////////////////////////////
    // Conduit & Zone Controller
    ////////////////////////////////////////////////////////////////////////////////
    console.time("transferring conduit & zone Controller ownership...");
    if (DRY_RUN) {
      const encodedData1 = conduitController.interface.encodeFunctionData(
        "transferOwnership",
        [conduit.address, paraSpaceAdminAddress]
      );
      console.log(`hex: ${encodedData1}`);
      const encodedData2 = zoneController.interface.encodeFunctionData(
        "transferOwnership",
        [paraSpaceAdminAddress]
      );
      console.log(`hex: ${encodedData2}`);
    } else {
      await waitForTx(
        await conduitController.transferOwnership(
          conduit.address,
          paraSpaceAdminAddress,
          GLOBAL_OVERRIDES
        )
      );
      await waitForTx(
        await zoneController.transferOwnership(
          paraSpaceAdminAddress,
          GLOBAL_OVERRIDES
        )
      );
    }
    console.timeEnd("transferring conduit & zone Controller ownership...");

    ////////////////////////////////////////////////////////////////////////////////
    // WETHGateway
    ////////////////////////////////////////////////////////////////////////////////
    if (await getContractAddressInDb(eContractid.WETHGatewayProxy)) {
      console.time("transferring wethGateway ownership...");
      const wethGatewayProxy = await getWETHGatewayProxy();
      if (DRY_RUN) {
        const encodedData = wethGatewayProxy.interface.encodeFunctionData(
          "transferOwnership",
          [gatewayAdminAddress]
        );
        console.log(`hex: ${encodedData}`);
      } else {
        await waitForTx(
          await wethGatewayProxy.transferOwnership(
            gatewayAdminAddress,
            GLOBAL_OVERRIDES
          )
        );
      }
      console.timeEnd("transferring wethGateway ownership...");
    }
    ////////////////////////////////////////////////////////////////////////////////
    // WPunksGateway
    ////////////////////////////////////////////////////////////////////////////////
    if (await getContractAddressInDb(eContractid.WPunkGatewayProxy)) {
      console.time("transferring wpunkGateway ownership...");
      const punkGatewayProxy = await getWPunkGatewayProxy();
      if (DRY_RUN) {
        const encodedData = punkGatewayProxy.interface.encodeFunctionData(
          "transferOwnership",
          [gatewayAdminAddress]
        );
        console.log(`hex: ${encodedData}`);
      } else {
        await waitForTx(
          await punkGatewayProxy.transferOwnership(
            gatewayAdminAddress,
            GLOBAL_OVERRIDES
          )
        );
      }
      console.timeEnd("transferring wpunkGateway ownership...");
    }

    ////////////////////////////////////////////////////////////////////////////////
    // cAPE
    ////////////////////////////////////////////////////////////////////////////////
    if (await getContractAddressInDb(eContractid.cAPE)) {
      console.time("transferring cAPE ownership...");
      const cApe = await getAutoCompoundApe();
      const cApeProxy = await getInitializableAdminUpgradeabilityProxy(
        cApe.address
      );
      if (DRY_RUN) {
        const encodedData1 = cApeProxy.interface.encodeFunctionData(
          "changeAdmin",
          [paraSpaceAdminAddress]
        );
        console.log(`hex: ${encodedData1}`);
        if (gatewayAdminAddress !== paraSpaceAdminAddress) {
          const encodedData2 = cApe.interface.encodeFunctionData(
            "transferOwnership",
            [gatewayAdminAddress]
          );
          console.log(`hex: ${encodedData2}`);
        }
      } else {
        await waitForTx(
          await cApeProxy.changeAdmin(paraSpaceAdminAddress, GLOBAL_OVERRIDES)
        );
        if (gatewayAdminAddress !== paraSpaceAdminAddress) {
          await waitForTx(
            await cApe.transferOwnership(gatewayAdminAddress, GLOBAL_OVERRIDES)
          );
        }
      }
      console.timeEnd("transferring cAPE ownership...");
    }

    ////////////////////////////////////////////////////////////////////////////////
    // NFTFloorOracle
    ////////////////////////////////////////////////////////////////////////////////
    if (await getContractAddressInDb(eContractid.NFTFloorOracle)) {
      const nftFloorOracle = await getNFTFloorOracle();
      console.time("transferring nftFloorOracle ownership...");
      if (DRY_RUN) {
        const encodedData1 = nftFloorOracle.interface.encodeFunctionData(
          "grantRole",
          [await nftFloorOracle.UPDATER_ROLE(), paraSpaceAdminAddress]
        );
        console.log(`hex: ${encodedData1}`);
        const encodedData2 = nftFloorOracle.interface.encodeFunctionData(
          "revokeRole",
          [await nftFloorOracle.UPDATER_ROLE(), deployerAddress]
        );
        console.log(`hex: ${encodedData2}`);
        const encodedData3 = nftFloorOracle.interface.encodeFunctionData(
          "grantRole",
          [await nftFloorOracle.DEFAULT_ADMIN_ROLE(), paraSpaceAdminAddress]
        );
        console.log(`hex: ${encodedData3}`);
        const encodedData4 = nftFloorOracle.interface.encodeFunctionData(
          "revokeRole",
          [await nftFloorOracle.DEFAULT_ADMIN_ROLE(), deployerAddress]
        );
        console.log(`hex: ${encodedData4}`);
      } else {
        await waitForTx(
          await nftFloorOracle.grantRole(
            await nftFloorOracle.UPDATER_ROLE(),
            paraSpaceAdminAddress,
            GLOBAL_OVERRIDES
          )
        );
        await waitForTx(
          await nftFloorOracle.revokeRole(
            await nftFloorOracle.UPDATER_ROLE(),
            deployerAddress,
            GLOBAL_OVERRIDES
          )
        );
        await waitForTx(
          await nftFloorOracle.grantRole(
            await nftFloorOracle.DEFAULT_ADMIN_ROLE(),
            paraSpaceAdminAddress,
            GLOBAL_OVERRIDES
          )
        );
        await waitForTx(
          await nftFloorOracle.revokeRole(
            await nftFloorOracle.DEFAULT_ADMIN_ROLE(),
            deployerAddress,
            GLOBAL_OVERRIDES
          )
        );
      }
      console.timeEnd("transferring nftFloorOracle ownership...");
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
