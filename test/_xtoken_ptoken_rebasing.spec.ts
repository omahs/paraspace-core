import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {expect} from "chai";
import {TestEnv} from "./helpers/make-suite";
import {testEnvFixture} from "./helpers/setup-env";
import {
  assertAlmostEqual,
  borrowAndValidate,
  supplyAndValidate,
} from "./helpers/validated-steps";
import {BigNumber, utils} from "ethers";
import {advanceTimeAndBlock, waitForTx} from "../helpers/misc-utils";
import {ONE_YEAR} from "../helpers/constants";

describe("Rebasing tokens", async () => {
  let testEnv: TestEnv;
  const firstYearRebasingIndex = BigNumber.from("1080000000000000000000000000");
  const rebasingIndexAnnualMultiplier = BigNumber.from(
    "110000000000000000000000000"
  );
  const secondYearRebasingIndex = firstYearRebasingIndex.rayMul(
    rebasingIndexAnnualMultiplier
  );

  const stETHSupplyAmount = utils.parseEther("100");
  const aWETHSupplyAmount = utils.parseEther("50");

  const stETHBorrowAmount = utils.parseEther("50");
  const aWETHBorrowAmount = utils.parseEther("25");

  const transferAmount = utils.parseEther("1");
  const withdrawAmount = utils.parseEther("1");

  const fixture = async () => {
    testEnv = await loadFixture(testEnvFixture);
    const {
      stETH,
      aWETH,
      users: [user1],
    } = testEnv;
    await stETH.setPooledEthBaseShares(firstYearRebasingIndex);
    await aWETH.setIncomeIndex(firstYearRebasingIndex);
    await supplyAndValidate(stETH, "100", user1, true);
    await supplyAndValidate(aWETH, "50", user1, true);
    await borrowAndValidate(stETH, "50", user1);
    await borrowAndValidate(aWETH, "25", user1);
    return testEnv;
  };

  it("TC-ptoken-rebasing-01: balance and totalSupply corresponding to supply amount", async () => {
    const {
      users: [user1],
      pstETH,
      paWETH,
    } = await loadFixture(fixture);

    assertAlmostEqual(await pstETH.balanceOf(user1.address), stETHSupplyAmount);
    assertAlmostEqual(await paWETH.balanceOf(user1.address), aWETHSupplyAmount);

    expect(await pstETH.scaledBalanceOf(user1.address)).to.be.eq(
      stETHSupplyAmount
    );
    expect(await paWETH.scaledBalanceOf(user1.address)).to.be.eq(
      aWETHSupplyAmount
    );

    assertAlmostEqual(await pstETH.totalSupply(), stETHSupplyAmount);
    assertAlmostEqual(await paWETH.totalSupply(), aWETHSupplyAmount);

    expect(await pstETH.scaledTotalSupply()).to.be.eq(stETHSupplyAmount);
    expect(await paWETH.scaledTotalSupply()).to.be.eq(aWETHSupplyAmount);
  });

  it("TC-ptoken-rebasing-02: debt and totalDebt corresponding to borrowAmount", async () => {
    const {
      users: [user1],
      variableDebtStETH,
      variableDebtAWeth,
    } = await loadFixture(fixture);

    assertAlmostEqual(
      await variableDebtStETH.balanceOf(user1.address),
      stETHBorrowAmount
    );
    assertAlmostEqual(
      await variableDebtAWeth.balanceOf(user1.address),
      aWETHBorrowAmount
    );

    expect(await variableDebtStETH.scaledBalanceOf(user1.address)).to.be.eq(
      stETHBorrowAmount
    );
    expect(await variableDebtAWeth.scaledBalanceOf(user1.address)).to.be.eq(
      aWETHBorrowAmount
    );

    assertAlmostEqual(await variableDebtStETH.totalSupply(), stETHBorrowAmount);
    assertAlmostEqual(await variableDebtAWeth.totalSupply(), aWETHBorrowAmount);

    expect(await variableDebtStETH.scaledTotalSupply()).to.be.eq(
      stETHBorrowAmount
    );
    expect(await variableDebtAWeth.scaledTotalSupply()).to.be.eq(
      aWETHBorrowAmount
    );
  });

  it("TC-ptoken-rebasing-03: scaledBalance and scaledTotalSupply will change only if rebasing index changes, growing liquidity index will not influence them", async () => {
    const {
      users: [user1],
      stETH,
      aWETH,
      pstETH,
      paWETH,
      variableDebtStETH,
      variableDebtAWeth,
    } = await loadFixture(fixture);
    await advanceTimeAndBlock(parseInt(ONE_YEAR));

    expect(await pstETH.scaledBalanceOf(user1.address)).to.be.eq(
      stETHSupplyAmount
    );
    expect(await paWETH.scaledBalanceOf(user1.address)).to.be.eq(
      aWETHSupplyAmount
    );

    expect(await pstETH.scaledTotalSupply()).to.be.eq(stETHSupplyAmount);
    expect(await paWETH.scaledTotalSupply()).to.be.eq(aWETHSupplyAmount);

    expect(await variableDebtStETH.scaledBalanceOf(user1.address)).to.be.eq(
      stETHBorrowAmount
    );
    expect(await variableDebtAWeth.scaledBalanceOf(user1.address)).to.be.eq(
      aWETHBorrowAmount
    );

    expect(await variableDebtStETH.scaledTotalSupply()).to.be.eq(
      stETHBorrowAmount
    );
    expect(await variableDebtAWeth.scaledTotalSupply()).to.be.eq(
      aWETHBorrowAmount
    );

    // change rebasingIndex
    await waitForTx(
      await stETH.setPooledEthBaseShares(secondYearRebasingIndex)
    );
    await waitForTx(await aWETH.setIncomeIndex(secondYearRebasingIndex));

    expect(
      (await pstETH.scaledBalanceOf(user1.address)).rayDiv(stETHSupplyAmount)
    ).to.be.eq(rebasingIndexAnnualMultiplier);
    expect(
      (await paWETH.scaledBalanceOf(user1.address)).rayDiv(aWETHSupplyAmount)
    ).to.be.eq(rebasingIndexAnnualMultiplier);

    expect(
      (await pstETH.scaledTotalSupply()).rayDiv(stETHSupplyAmount)
    ).to.be.eq(rebasingIndexAnnualMultiplier);
    expect(
      (await paWETH.scaledTotalSupply()).rayDiv(aWETHSupplyAmount)
    ).to.be.eq(rebasingIndexAnnualMultiplier);

    expect(
      (await variableDebtStETH.scaledBalanceOf(user1.address)).rayDiv(
        stETHBorrowAmount
      )
    ).to.be.eq(rebasingIndexAnnualMultiplier);
    expect(
      (await variableDebtAWeth.scaledBalanceOf(user1.address)).rayDiv(
        aWETHBorrowAmount
      )
    ).to.be.eq(rebasingIndexAnnualMultiplier);

    expect(
      (await variableDebtStETH.scaledTotalSupply()).rayDiv(stETHBorrowAmount)
    ).to.be.eq(rebasingIndexAnnualMultiplier);
    expect(
      (await variableDebtAWeth.scaledTotalSupply()).rayDiv(aWETHBorrowAmount)
    ).to.be.eq(rebasingIndexAnnualMultiplier);
  });

  it("TC-ptoken-rebasing-03: balance, debt, totalSupply and totalDebt will change over time even if rebasingIndex stays the same", async () => {
    const {
      users: [user1],
      pstETH,
      paWETH,
      variableDebtStETH,
      variableDebtAWeth,
    } = await loadFixture(fixture);

    const pstETHBalanceBefore = await pstETH.balanceOf(user1.address);
    const paWETHBalanceBefore = await paWETH.balanceOf(user1.address);

    const pstETHTotalSupplyBefore = await pstETH.totalSupply();
    const paWETHTotalSupplyBefore = await paWETH.totalSupply();

    const stETHDebtBefore = await variableDebtStETH.balanceOf(user1.address);
    const aWETHDebtBefore = await variableDebtAWeth.balanceOf(user1.address);

    const stETHTotalDebtBefore = await variableDebtStETH.totalSupply();
    const aWETHTotalDebtBefore = await variableDebtAWeth.totalSupply();

    await advanceTimeAndBlock(parseInt(ONE_YEAR));

    const pstETHBalanceAfter = await pstETH.balanceOf(user1.address);
    const paWETHBalanceAfter = await paWETH.balanceOf(user1.address);

    const pstETHTotalSupplyAfter = await pstETH.totalSupply();
    const paWETHTotalSupplyAfter = await paWETH.totalSupply();

    const stETHDebtAfter = await variableDebtStETH.balanceOf(user1.address);
    const aWETHDebtAfter = await variableDebtAWeth.balanceOf(user1.address);

    const stETHTotalDebtAfter = await variableDebtStETH.totalSupply();
    const aWETHTotalDebtAfter = await variableDebtAWeth.totalSupply();

    expect(pstETHBalanceAfter).to.be.gt(pstETHBalanceBefore);
    expect(paWETHBalanceAfter).to.be.gt(paWETHBalanceBefore);

    expect(pstETHTotalSupplyAfter).to.be.gt(pstETHTotalSupplyBefore);
    expect(paWETHTotalSupplyAfter).to.be.gt(paWETHTotalSupplyBefore);

    expect(stETHDebtAfter).to.be.gt(stETHDebtBefore);
    expect(aWETHDebtAfter).to.be.gt(aWETHDebtBefore);

    expect(stETHTotalDebtAfter).to.be.gt(stETHTotalDebtBefore);
    expect(aWETHTotalDebtAfter).to.be.gt(aWETHTotalDebtBefore);
  });

  it("TC-ptoken-rebasing-04: transfer rebasing token to other users will decrease, increase balance correctly", async () => {
    const {
      users: [user1, user2],
      pstETH,
      paWETH,
    } = await loadFixture(fixture);

    const user1PstETHBalanceBefore = await pstETH.balanceOf(user1.address);
    const user1PaWETHBalanceBefore = await paWETH.balanceOf(user1.address);

    const user2PstETHBalanceBefore = await pstETH.balanceOf(user2.address);
    const user2PaWETHBalanceBefore = await paWETH.balanceOf(user2.address);

    await waitForTx(
      await pstETH.connect(user1.signer).transfer(user2.address, transferAmount)
    );

    await waitForTx(
      await paWETH.connect(user1.signer).transfer(user2.address, transferAmount)
    );

    const user1PstETHBalanceAfter = await pstETH.balanceOf(user1.address);
    const user1PaWETHBalanceAfter = await paWETH.balanceOf(user1.address);

    const user2PstETHBalanceAfter = await pstETH.balanceOf(user2.address);
    const user2PaWETHBalanceAfter = await paWETH.balanceOf(user2.address);

    assertAlmostEqual(
      user1PaWETHBalanceBefore.sub(user1PaWETHBalanceAfter),
      transferAmount
    );
    assertAlmostEqual(
      user2PaWETHBalanceAfter.sub(user2PaWETHBalanceBefore),
      transferAmount
    );

    assertAlmostEqual(
      user1PstETHBalanceBefore.sub(user1PstETHBalanceAfter),
      transferAmount
    );
    assertAlmostEqual(
      user2PstETHBalanceAfter.sub(user2PstETHBalanceBefore),
      transferAmount
    );
  });

  it("TC-ptoken-rebasing-05: withdraw rebasing tokens will transfer underlying assets correctly", async () => {
    const {
      users: [user1],
      stETH,
      aWETH,
      pstETH,
      paWETH,
      pool,
    } = await loadFixture(fixture);

    const user1PstETHBalanceBefore = await pstETH.balanceOf(user1.address);
    const user1PaWETHBalanceBefore = await paWETH.balanceOf(user1.address);

    const user1stETHBalanceBefore = await stETH.balanceOf(user1.address);
    const user1aWETHBalanceBefore = await aWETH.balanceOf(user1.address);

    await waitForTx(
      await pool
        .connect(user1.signer)
        .withdraw(stETH.address, withdrawAmount, user1.address)
    );

    await waitForTx(
      await pool
        .connect(user1.signer)
        .withdraw(aWETH.address, withdrawAmount, user1.address)
    );

    const user1PstETHBalanceAfter = await pstETH.balanceOf(user1.address);
    const user1PaWETHBalanceAfter = await paWETH.balanceOf(user1.address);

    const user1stETHBalanceAfter = await stETH.balanceOf(user1.address);
    const user1aWETHBalanceAfter = await aWETH.balanceOf(user1.address);

    assertAlmostEqual(
      user1PaWETHBalanceBefore.sub(user1PaWETHBalanceAfter),
      withdrawAmount
    );
    assertAlmostEqual(
      user1PstETHBalanceBefore.sub(user1PstETHBalanceAfter),
      withdrawAmount
    );

    assertAlmostEqual(
      user1aWETHBalanceAfter.sub(user1aWETHBalanceBefore),
      withdrawAmount
    );
    assertAlmostEqual(
      user1stETHBalanceAfter.sub(user1stETHBalanceBefore),
      withdrawAmount
    );
  });
});
