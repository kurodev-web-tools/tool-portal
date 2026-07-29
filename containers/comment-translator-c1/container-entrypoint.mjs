const hold = setInterval(() => {}, 60_000);

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.once(signal, () => {
    clearInterval(hold);
    process.exit(0);
  });
}
