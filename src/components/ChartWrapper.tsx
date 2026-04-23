/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ResponsiveContainer } from "recharts";

interface ChartWrapperProps {
  height?: number;
  children: React.ReactElement;
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({
  height = 240,
  children,
}) => {
  return (
    <div
      style={{
        display    : "block",
        width      : "100%",
        height     : `${height}px`,
        minHeight  : `${height}px`,
        minWidth   : "0px",
        position   : "relative",
      }}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        minHeight={height}
        debounce={50}
      >
        {children}
      </ResponsiveContainer>
    </div>
  );
};

export default ChartWrapper;
