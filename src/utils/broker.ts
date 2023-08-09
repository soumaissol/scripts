function formatRegisterNumber(num: number): string {
  const s = '000000' + num;
  return `${s.substring(s.length - 6)}-F`;
}

export { formatRegisterNumber };
