import chalk from "chalk";
import figlet from "figlet";
import chalkAnimation from "chalk-animation";
import inquirer from "inquirer";
import { createSpinner } from "nanospinner";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const highscorePath = path.join(__dirname, "highscore.json");
const playersDir = path.join(__dirname, "players");
const bankPath = path.join(__dirname, "bank.json");
let playerName;
let money = 100;
let bet = 0;
let choice;
let again = "yes";
let playerData;
let rounds = 0;

const sleepShort = (ms = 1500) => new Promise((r) => setTimeout(r, ms));
const sleepLong = (ms = 2000) => new Promise((r) => setTimeout(r, ms));

function loadBankData() {
  if (!fs.existsSync(bankPath)) {
    fs.writeFileSync(bankPath, JSON.stringify({ profit: 0 }, null, 2));
  }
  const data = fs.readFileSync(bankPath, "utf-8");
  return JSON.parse(data);
}

function saveBankData(profitChange) {
  const bankData = loadBankData();
  bankData.profit += profitChange;
  fs.writeFileSync(bankPath, JSON.stringify(bankData, null, 2));
}
function ensurePlayersDirectory() {
  if (!fs.existsSync(playersDir)) {
    fs.mkdirSync(playersDir);
  }
}

function appendResultsToFile(results) {
  const filePath = path.join(__dirname, "result.json");
  let existingData = [];

  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      existingData = JSON.parse(fileContent);
    } catch (err) {
      // console.error('error reading the file', err);
      return;
    }
  }

  const updatedData = existingData.concat(results);

  try {
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), "utf-8");
    //console.log('results saved successfully!');
  } catch (err) {
    return;
    //    console.error('erro writing the file', err);
  }
}

function getPlayerFilePath(name) {
  return path.join(playersDir, `${name}.json`);
}

function loadOrCreatePlayer(name) {
  const filePath = getPlayerFilePath(name);
  if (!fs.existsSync(filePath)) {
    const defaultData = {
      name,
      highscore: 0,
      gamesPlayed: 0,
      banUntil: null,
      balance: 100,
      timesGotMoneyFromBank: 0,
    };
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    return defaultData;
  } else {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  }
}

function savePlayerData(playerData) {
  const filePath = getPlayerFilePath(playerData.name);
  fs.writeFileSync(filePath, JSON.stringify(playerData, null, 2));
}

async function start() {
  console.log("\n");
  const ascii = await generateASCII("CLI ROULETTE", "3-D");
  const neonTitle = chalkAnimation.neon(centerText(ascii), 2);
  await sleepLong();
  neonTitle.stop();
}

function centerText(text) {
  const terminalWidth = process.stdout.columns;
  const lines = text.split("\n");
  return lines
    .map((line) => {
      const padding = Math.floor((terminalWidth - line.length) / 2);
      return " ".repeat(Math.max(padding, 0)) + line;
    })
    .join("\n");
}

function generateASCII(text, font) {
  return new Promise((resolve, reject) => {
    figlet(text, { font: font }, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });
}

function welcome() {
  console.log(
    chalk.bold(
      `\nWelcome ${playerName} to the absolute fantastic Cli-Roulette ♠ experience! \nYour current money: ${chalk.bgGreen.black(
        money,
      )}$`,
    ),
  );
}

async function askPlayerName() {
  const answer = await inquirer.prompt({
    name: "playerName",
    type: "input",
    message: "Enter your name:",
    default: "Anonymous",
  });
  playerName = answer.playerName;
}

function loadHighscore() {
  if (!fs.existsSync(highscorePath)) {
    fs.writeFileSync(
      highscorePath,
      JSON.stringify({ name: "Nobody", score: 0 }, null, 2),
    );
  }
  const data = fs.readFileSync(highscorePath, "utf-8");
  return JSON.parse(data);
}
function saveHighscore(name, score) {
  const current = loadHighscore();
  if (score > current.score) {
    fs.writeFileSync(highscorePath, JSON.stringify({ name, score }, null, 2));
    console.log(chalk.green(`\n🎉 New highscore by ${name}: ${score}$!`));
  } else {
    console.log(
      chalk.yellow(
        `\nNo new global highscore. Current record: ${current.name} with ${current.score}$`,
      ),
    );
  }
}
function showHighscore() {
  const { name, score } = loadHighscore();
  console.log(
    chalk.cyan(`\nThe current global highsore is ${score}$ from ${name}`),
  );
  console.log(
    chalk.blue(
      `${
        playerData.highscore === 0
          ? "You dont have a highscore right now"
          : `Your highscore is ${playerData.highscore}$`
      }`,
    ),
  );
}

async function askHowMuchToBet() {
  const answer = await inquirer.prompt({
    name: "player_bet",
    type: "input",
    message: "How much do you want to bet?",
    default: 10,
    validate: (input) => {
      const value = parseInt(input);
      if (isNaN(value) || value <= 0) {
        return "Please enter a valid positive number.";
      }
      return true;
    },
  });
  bet = parseInt(answer.player_bet);
  await handleBet();
}
async function handleBet() {
  const spinner = createSpinner("Checking money...").start();
  await sleepShort();
  if (bet <= money) {
    spinner.success({ text: "You have enough money to gamble" });
  } else {
    spinner.error({
      text: `You don't have enough money (${chalk.bgGreen.black(
        money,
      )}) to gamble. Try again!`,
    });
    await askHowMuchToBet();
  }
}
async function explanation() {
  console.log(
    "\nTake your bet! \nYou can choose between betting on:\n" +
      "- a specific number (0–36)\n" +
      "- on one dozen (1-12, 13-24, 25-36)\n" +
      "- low (1-18) or high (19-36)\n" +
      "- even or odd\n" +
      "- red or black\n",
  );
  const spinner = createSpinner(" ").start();
  await sleepLong();
  spinner.success();
}
async function setYourBet() {
  const { betType } = await inquirer.prompt({
    name: "betType",
    type: "list",
    message: "What type of bet do you want to place?",
    choices: ["number", "even/odd", "color", "high/low"],
  });

  switch (betType) {
    case "number": {
      const { betType_Number } = await inquirer.prompt({
        name: "betType_Number",
        type: "list",
        message:
          "You can either bet on the value of the number or on a specific number",
        choices: ["specific number", "1-12", "13-24", "25-36"],
      });

      switch (betType_Number) {
        case "specific number": {
          const { playerNumber } = await inquirer.prompt({
            name: "playerNumber",
            type: "input",
            message: "Enter a number between 0 and 36:",
            validate: (input) => {
              const value = parseInt(input);
              if (isNaN(value) || value < 0 || value > 36) {
                return "Please enter a valid number between 0 and 36.";
              }
              return true;
            },
          });
          choice = parseInt(playerNumber);
          break;
        }
        case "1-12":
        case "13-24":
        case "25-36":
          choice = betType_Number;
          break;
      }
      break;
    }

    case "even/odd": {
      const { evenOdd } = await inquirer.prompt({
        name: "evenOdd",
        type: "list",
        message: "Do you bet on even or odd?",
        choices: ["even", "odd"],
      });
      choice = evenOdd;
      break;
    }
    case "high/low": {
      const { highLow } = await inquirer.prompt({
        name: "highLow",
        type: "list",
        message: "Do you bet on low (1-18) or high(19-36)?",
        choices: ["low", "high"],
      });
      choice = highLow;
      break;
    }

    case "color": {
      const { color } = await inquirer.prompt({
        name: "color",
        type: "list",
        message: "Do you bet on red or black?",
        choices: [
          { name: chalk.bgRed.black(" red "), value: "red" },
          { name: chalk.bgBlack.white(" black "), value: "black" },
        ],
      });
      choice = color;
      break;
    }
  }
  console.log(chalk.green(`\nYou bet on: ${chalk.bold(choice)}\n`));
}

async function handleChoice() {
  console.log("\n");
  const spinner = createSpinner("Spinning the ball...").start();
  await sleepShort(1000);
  spinner.update({ text: "Ball is rolling..." });
  await sleepShort(1000);
  spinner.update({ text: "Almost there..." });
  await sleepShort(1000);
  spinner.success({ text: "The result is in!" });

  await generateResult();
  await handleResult();
  await tryAgain();
}

let results = [];
async function generateResult() {
  const number = Math.floor(Math.random() * 37);
  const redNumbers = [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ];
  let color = redNumbers.includes(number) ? "red" : "black";
  const resultASCII = await generateASCII(number, "Larry 3D");
  let asciiColor = color === "black" ? "#949494" : "#e80000";
  if (number === 0) {
    color = "green";
    asciiColor = "#168c0b";
  }
  const result = { number, color };
  results.push(result);
  const centeredText = centerText(resultASCII);
  console.log(chalk.hex(asciiColor).bold(centeredText));
  await sleepShort();
}
async function handleResult() {
  const lastResult = results.at(-1);
  const { number, color } = lastResult;

  let profitChange = 0;
  let won;

  if (choice === number) {
    won = true;
    money += number === 0 ? bet * 35 + bet * 0.27 : bet * 35;
    profitChange -= number === 0 ? bet * 35 + bet * 0.27 : bet * 35;
  } else if (choice === "1-12" && number >= 1 && number <= 12) {
    won = true;
    money += bet * 2;
    profitChange -= bet * 2;
  } else if (choice === "13-24" && number >= 13 && number <= 24) {
    won = true;
    money += bet * 2;
    profitChange -= bet * 2;
  } else if (choice === "25-36" && number >= 25 && number <= 36) {
    won = true;
    money += bet * 2;
    profitChange -= bet * 2;
  } else if (choice === "high" && number >= 19) {
    won = true;
    money += bet;
    profitChange -= bet;
  } else if (choice === "low" && number >= 1 && number <= 18) {
    won = true;
    money += bet;
    profitChange -= bet;
  } else if (choice === "even") {
    if (number != 0 && number % 2 == 0) {
      won = true;
      money += bet;
      profitChange -= bet;
    }
  } else if (choice === "odd") {
    if (number != 0 && number % 2 == 1) {
      won = true;
      money += bet;
      profitChange -= bet;
    }
  } else if (choice === color) {
    won = true;
    money += bet;
    profitChange -= bet;
  }

  if (won) {
    const ascii = await generateASCII("YOU WON", "3-D");
    const rainbowTitle = chalkAnimation.rainbow(centerText(ascii));
    rainbowTitle.start();
    await sleepLong();
    rainbowTitle.stop();
  } else {
    const text = await generateASCII("LOSER", "3-D");
    const pulseTitle = chalkAnimation.pulse(centerText(text), 2);
    await sleepLong();
    pulseTitle.stop();
    money -= bet;
    profitChange += bet;
    console.log(`\nYou have now: ${chalk.bgGreen.black(money)}$`);
  }

  saveBankData(profitChange);
}

async function tryAgain() {
  console.log("\n");
  const answer = await inquirer.prompt({
    name: "again",
    type: "list",
    message: "Do you want to play again or checkout?\n",
    choices: ["yes", "checkout"],
  });
  again = answer.again;
}
function checkBanStatus(playerData) {
  if (playerData.banUntil && Date.now() < playerData.banUntil) {
    const remaining = Math.ceil((playerData.banUntil - Date.now()) / 1000);
    console.log(
      chalk.red.bold(
        `\n⛔ You are banned from playing for ${remaining} more seconds.\nCome back later!`,
      ),
    );
    return true;
  }
  return false;
}
function handleBalance(playerData) {
  if (playerData.balance === 0) {
    playerData.balance = 100;
    saveBankData(-100);
    playerData.timesGotMoneyFromBank++;
    console.log(
      chalk.green("\nYou were broke, but the bank granted you 100$ 💰"),
    );
  } else {
    if (playerData.gamesPlayed >= 1) {
      const times = playerData.timesGotMoneyFromBank;
      let fee = 0;

      if (times >= 25) {
        fee = playerData.balance * 0.25;
      } else {
        const factor = Math.max(0, (times * 0.5 + 1) / 100);
        fee = playerData.balance * factor;
      }
      fee = Math.floor(fee);
      saveBankData(fee);
      playerData.balance -= fee;
      console.log(
        chalk.red("You had to pay the bank some money back to play again"),
      );
    }
  }
}

async function playRound() {
  welcome();
  await sleepShort();
  showHighscore();
  await sleepShort();
  if (rounds < 1) {
    await explanation();
  }
  await askHowMuchToBet();
  await setYourBet();
  await handleChoice();
}
async function main() {
  console.clear();
  await start();
  ensurePlayersDirectory();
  await askPlayerName();
  playerData = loadOrCreatePlayer(playerName);
  if (checkBanStatus(playerData)) return;

  handleBalance(playerData);
  money = playerData.balance;

  while (again === "yes" && money > 0) {
    await playRound();
    rounds++;
    if (again === "yes" && money > 0) {
      console.clear();
    } else if (again === "yes" && money <= 0) {
      console.clear();
      console.log("\n", "\n", "\n");
      const ascii = await generateASCII("GAME OVER", "3-D");
      const glitch = chalkAnimation.glitch(centerText(ascii));
      await sleepLong();
      glitch.stop();
    }
  }

  if (money <= 0) {
    playerData.banUntil = Date.now() + 2 * 60 * 1000;
    console.log(
      chalk.red.bold("\n💸 You're broke! You've been banned for 2 minutes."),
    );
  } else {
    playerData.banUntil = null;
  }

  playerData.gamesPlayed += 1;
  if (money > playerData.highscore) {
    playerData.highscore = money;
  }
  playerData.balance = money;
  savePlayerData(playerData);
  saveHighscore(playerName, money);
  appendResultsToFile(results);
  console.log(
    chalk.red.bold(
      `\nThanks for playing CLI ROULETTE! Final money: ${chalk.bgGreen.black(
        money,
      )}$\n`,
    ),
  );
  process.exit(0);
}

main();
