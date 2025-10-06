import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Input } from '../../../lib/custom-ui';

const URLField = ({ defaultValue, onUpdate, disabled }) => {
  const [value, setValue] = useState(defaultValue || '');
  const [error, setError] = useState(false);

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setValue(newValue);
    setError(false);
  }, []);

  const validateURL = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleBlur = useCallback(() => {
    if (value) {
      if (validateURL(value)) {
        setError(false);
        onUpdate(value);
      } else {
        setError(true);
      }
    } else {
      setError(false);
      onUpdate('');
    }
  }, [value, onUpdate]);

  return (
    <Input
      fluid
      type="url"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder="https://example.com"
      error={error}
    />
  );
};

URLField.propTypes = {
  defaultValue: PropTypes.string,
  onUpdate: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default React.memo(URLField);
