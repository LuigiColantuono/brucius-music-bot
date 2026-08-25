import { spawn } from 'child_process';
import chalk from 'chalk';

console.log(chalk.cyan('🚀 Avvio di 𝗕 𝗥 𝗨 𝗖 𝗜 𝗨 𝗦 🎵...'));

// Avvia il bot
const botProcess = spawn('bun', ['run', 'start'], {
    stdio: 'inherit',
    shell: true
});

// Avvia la dashboard (se esiste)
const dashboardProcess = spawn('bun', ['run', 'dashboard:dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
});

// Gestione shutdown
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 Arresto in corso...'));
    botProcess.kill('SIGINT');
    dashboardProcess.kill('SIGINT');
    process.exit(0);
});

botProcess.on('close', (code) => {
    console.log(chalk.red(`Bot process exited with code ${code}`));
    dashboardProcess.kill('SIGINT');
    process.exit(code);
});
