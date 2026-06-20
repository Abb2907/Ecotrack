import React from "react";

/**
 * Props for the Card component.
 */

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

/**
 * A reusable Card component that provides a styled container for content.
 * Features a glassmorphism design and optional hover effects.
 *
 * @param {CardProps} props - The card properties.
 * @returns {React.ReactElement} The rendered card element.
 */
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
