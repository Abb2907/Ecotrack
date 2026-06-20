import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = "", hoverable = true }) => {
  return (
    <div
      className={`glass-panel rounded-xl p-6 shadow-glass border border-brand-border ${
        hoverable ? "glass-panel-hover" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
};
export default Card;
