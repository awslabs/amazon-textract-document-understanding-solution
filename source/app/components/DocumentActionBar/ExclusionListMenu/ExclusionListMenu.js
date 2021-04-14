import { Menu, MenuButton, MenuList, MenuItem, Button } from '@chakra-ui/react';
import { getEscapedStringRegExp } from '../../../utils/getEscapedStringRegExp';
import { getDocumentPageCount, getPageWordsBySearch } from '../../../utils/document';
import { addRedactions } from '../../../store/entities/documents/actions';
import { batch, useDispatch, useSelector } from 'react-redux';
import { ActionBarButton } from '../ActionBarButton/ActionBarButton';

export const ExclusionListMenu = ({ document }) => {
  const dispatch = useDispatch();
  const exclusionLists = useSelector((state) => state.entities.exclusionLists);

  const { documentId } = document;

  const applyExclusionList = (e) => {
    const name = e.target.value;

    const { items } = exclusionLists.find((list) => list.name === name);

    batch(() => {
      const regexes = items.map(
        ({ type, value }) => new RegExp(type === 'string' ? getEscapedStringRegExp(value) : value, 'i'),
      );

      Array(getDocumentPageCount(document))
        .fill(null)
        .map((_, i) => i + 1)
        .forEach((pageNumber) => {
          const matchingTerms = getPageWordsBySearch(document, pageNumber, regexes);

          dispatch(addRedactions(documentId, pageNumber, matchingTerms));
        });
    });
  };

  return (
    <Menu placement='bottom'>
      <MenuButton as={ActionBarButton}>Exclusion lists</MenuButton>

      <MenuList bg='#fff' color='#000'>
        {exclusionLists.map(({ name }, i) => (
          <MenuItem
            key={i}
            value={name}
            onClick={applyExclusionList}
            backgroundColor='inherit'
            _focus={{ bg: 'rgba(0, 0, 0, 0.06)' }}
            border='none'
            fontSize='1rem'
          >
            {name}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
};
