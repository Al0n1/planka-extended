import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Input } from '../../../lib/custom-ui';

const EmailField = ({ defaultValue, onUpdate, disabled }) => {
  const [value, setValue] = useState(defaultValue || '');
  const [error, setError] = useState(false);

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setValue(newValue);
    setError(false);
  }, []);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleBlur = useCallback(() => {
    if (value) {
      if (validateEmail(value)) {
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
      type="email"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder="email@example.com"
      error={error}
    />
  );
};

EmailField.propTypes = {
  defaultValue: PropTypes.string,
  onUpdate: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default React.memo(EmailField);
