import React from "react";

export function Select({ value, onValueChange, children }) {
  const childArray = React.Children.toArray(children);
  const trigger = childArray.find(
    (child) => React.isValidElement(child) && child.type === SelectTrigger,
  );
  const content = childArray.find(
    (child) => React.isValidElement(child) && child.type === SelectContent,
  );

  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={trigger?.props.className}
      data-testid={trigger?.props["data-testid"]}
    >
      {content?.props.children}
    </select>
  );
}

export function SelectTrigger() {
  return null;
}

export function SelectValue() {
  return null;
}

export function SelectContent() {
  return null;
}

export function SelectItem() {
  return null;
}
