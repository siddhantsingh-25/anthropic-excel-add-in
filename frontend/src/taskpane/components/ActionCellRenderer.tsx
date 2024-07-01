import * as React from "react";
const ActionCellRenderer = (props) => {
  const deleteRow = () => {
    props.api.applyTransaction({ remove: [props.node.data] });
  };

  return <button onClick={deleteRow}>Delete Row</button>;
};

export default ActionCellRenderer;
