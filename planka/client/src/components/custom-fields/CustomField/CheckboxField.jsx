import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from 'semantic-ui-react';

const CheckboxField = ({ defaultValue, onUpdate, disabled }) => {
  const checked = defaultValue === 'true';

  const handleChange = useCallback((e, { checked: newChecked }) => {
    onUpdate(newChecked ? 'true' : 'false');
  }, [onUpdate]);

  return (
    <Checkbox
      checked={checked}
      onChange={handleChange}
      disabled={disabled}
    />
  );
};

CheckboxField.propTypes = {
  defaultValue: PropTypes.string,
  onUpdate: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default React.memo(CheckboxField);
