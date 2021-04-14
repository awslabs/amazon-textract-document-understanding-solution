import { Flex, Box, HStack, useMediaQuery } from '@chakra-ui/react';
import { useDispatch, useSelector } from 'react-redux';
import ExportPreview from './ExportPreview/ExportPreview';
import { clearRedactions, saveRedactions } from '../../store/entities/documents/actions';
import DocumentSearchBar from '../DocumentSearchBar/DocumentSearchBar';
import { ExclusionListMenu } from './ExclusionListMenu/ExclusionListMenu';
import { getAreRedactionsOnDocument } from '../../utils/document';
import { ActionBarButton } from './ActionBarButton/ActionBarButton';

const DocumentActionBar = ({ document, isComplianceTrack, redactMatches }) => {
  const dispatch = useDispatch();
  const { documentId, redactions } = document;
  const [showRedactionLegend] = useMediaQuery('(min-width: 1550px)');
  const isSavingRedactions = useSelector((state) => state.entities.isSavingRedactions);
  const areUnsavedRedactions = useSelector((state) => state.entities.areUnsavedRedactions);

  return (
    <Flex py={3} px='2.96875vw' justifyContent={showRedactionLegend ? 'space-between' : 'flex-end'} alignItems='center'>
      {isComplianceTrack && showRedactionLegend && (
        <Box aria-hidden pointerEvents='none' boxShadow='0 0 0 2px #000' bg='#80808033' px={2} color='#000'>
          Redacted
        </Box>
      )}

      <HStack spacing={2} alignItems='center'>
        {isComplianceTrack && (
          <>
            <ActionBarButton
              onClick={() => dispatch(saveRedactions(documentId, redactions))}
              isLoading={isSavingRedactions}
              disabled={!areUnsavedRedactions}
            >
              Save
            </ActionBarButton>

            <ExclusionListMenu document={document} />

            <ExportPreview />

            <ActionBarButton
              onClick={() => dispatch(clearRedactions(documentId))}
              disabled={!getAreRedactionsOnDocument(document)}
            >
              Clear Redactions
            </ActionBarButton>
          </>
        )}

        <Flex alignItems='center'>
          <Box as={DocumentSearchBar} placeholder='Search current document…' />
          {isComplianceTrack && (
            <ActionBarButton onClick={redactMatches} ml={2} bg='#f90'>
              Redact matches
            </ActionBarButton>
          )}
        </Flex>
      </HStack>
    </Flex>
  );
};

export default DocumentActionBar;
