interface ProgressBarProps {
  percent: number;
}

const ProgressBar = ({ percent }: ProgressBarProps) => (
  <div className="w-full h-[2px] rounded-full overflow-hidden" style={{ background: "hsl(150 15% 88%)" }}>
    <div
      className="h-full rounded-full transition-all duration-700 ease-out"
      style={{
        width: `${percent}%`,
        background: "linear-gradient(90deg, hsl(153 70% 38%), hsl(43 75% 50%))",
      }}
    />
  </div>
);

export default ProgressBar;
