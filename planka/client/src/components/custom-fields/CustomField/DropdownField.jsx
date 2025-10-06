import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Dropdown } from 'semantic-ui-react';

const DropdownField = ({ defaultValue, config, onUpdate, disabled }) => {
  const options = config?.options || [];
  
  const handleChange = useCallback((e, { value }) => {
    onUpdate(value);
  }, [onUpdate]);

  return (
    <Dropdown
      fluid
      selection
      value={defaultValue || ''}
      options={options.map(option => ({
        key: option,
        value: option,
        text: option,
      }))}
      onChange={handleChange}
      disabled={disabled}
      placeholder="Select value..."
      clearable
    />
  );
};

DropdownField.propTypes = {
  defaultValue: PropTypes.string,
  config: PropTypes.object,
  onUpdate: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default React.memo(DropdownField);
