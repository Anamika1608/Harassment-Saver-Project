import {
  Button,
  Flex,
  Image,
  Link,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import logoWhite from 'img/layout/logoWhite.png';

export default function SidebarDocs() {
  const bgColor = 'linear-gradient(135deg, #868CFF 0%, #4318FF 100%)';
  const borderColor = useColorModeValue('white', 'navy.800');

  return (
    <Flex
      justify="center"
      direction="column"
      align="center"
      bg={bgColor}
      borderRadius="30px"
      me="20px"
      position="relative"
    >
      <Flex
        border="5px solid"
        borderColor={borderColor}
        bg="linear-gradient(135deg, #868CFF 0%, #4318FF 100%)"
        borderRadius="50%"
        w="94px"
        h="94px"
        align="center"
        justify="center"
        mx="auto"
        position="absolute"
        left="50%"
        top="-47px"
        transform="translate(-50%, 0%)"
      >
        <Image alt="" src={logoWhite.src} w="40px" h="40px" />
      </Flex>
      <Flex
        direction="column"
        mb="12px"
        align="center"
        justify="center"
        px="15px"
        pt="55px"
      >
        <Text
          fontSize={{ base: 'lg', xl: '18px' }}
          color="white"
          fontWeight="bold"
          lineHeight="150%"
          textAlign="center"
          px="10px"
          mb="14px"
        >
          Unlock Premium Protection
        </Text>
        <Text
          fontSize="14px"
          color={'white'}
          px="10px"
          mb="14px"
          textAlign="center"
        >
          Get access to advanced AI-driven evidence analysis, priority report processing, and legal guidance with our premium features.
        </Text>
      </Flex>
      <Link href="https://yourplatform.com/premium">
        <Button
          bg="whiteAlpha.300"
          _hover={{ bg: 'whiteAlpha.200' }}
          _active={{ bg: 'whiteAlpha.100' }}
          mb={{ sm: '16px', xl: '24px' }}
          color={'white'}
          fontWeight="regular"
          fontSize="sm"
          minW="185px"
          mx="auto"
        >
          Upgrade to Premium
        </Button>
      </Link>
    </Flex>
  );
}
