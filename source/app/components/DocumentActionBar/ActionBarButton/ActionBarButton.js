import { Button } from '@chakra-ui/react';

export const ActionBarButton = React.forwardRef((props, ref) => (
  <Button
    ref={ref}
    size='sm'
    bg='#eee'
    border='1px solid #cfcfcf'
    borderRadius='2px'
    fontSize='0.9rem'
    fontWeight='normal'
    {...props}
  />
));
